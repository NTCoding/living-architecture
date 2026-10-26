#!/usr/bin/env node
// Session analysis: reads one factory run out of .factory/mastra.db and prints
// a markdown breakdown of where the implementer's time went, so a person or
// agent can turn the numbers into efficiency improvements.
//
// Usage: node scripts/analyze-session.mjs <runId> [path/to/mastra.db]
// Example: node scripts/analyze-session.mjs issue-501-9
//
// Timing comes from the observability spans (names, types, timestamps). Command
// and file details come from the mastra_messages transcripts, which are plain
// JSON. Span payloads themselves are truncated binary blobs in the database and
// are deliberately not decoded.

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'

const runId = process.argv[2]
if (!runId) {
  console.error('Usage: node scripts/analyze-session.mjs <runId> [path/to/mastra.db]')
  process.exit(1)
}
const dbPath = resolve(process.argv[3] ?? '.factory/mastra.db')
const logsDir = join(dirname(dbPath), 'logs')
const db = new DatabaseSync(dbPath, { readOnly: true })

const IMPLEMENT_STEP = "workflow step: 'implement'"
const IMPLEMENTER_THREAD_SUFFIX = '-implementer'

// ---------- small helpers ----------

const toMs = (iso) => new Date(iso).getTime()

function fmtDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, '0')}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`
}

function fmtPct(part, whole) {
  if (!whole) return '0%'
  return `${Math.round((part / whole) * 100)}%`
}

const timeOf = (iso) => new Date(iso).toISOString().replace('T', ' ').slice(0, 19)

// Union of [start, end) intervals, returned merged and sorted.
function unionIntervals(intervals) {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start)
  const merged = []
  for (const interval of sorted) {
    const last = merged[merged.length - 1]
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end)
    } else {
      merged.push({ ...interval })
    }
  }
  return merged
}

function totalOf(intervals) {
  return intervals.reduce((sum, i) => sum + (i.end - i.start), 0)
}

function intersectIntervals(a, b) {
  const out = []
  for (const i of a) {
    for (const j of b) {
      const start = Math.max(i.start, j.start)
      const end = Math.min(i.end, j.end)
      if (end > start) out.push({ start, end })
    }
  }
  return unionIntervals(out)
}

function subtractIntervals(from, remove) {
  let out = from.map((i) => ({ ...i }))
  for (const r of remove) {
    const next = []
    for (const i of out) {
      if (r.end <= i.start || r.start >= i.end) {
        next.push(i)
        continue
      }
      if (r.start > i.start) next.push({ start: i.start, end: r.start })
      if (r.end < i.end) next.push({ start: r.end, end: i.end })
    }
    out = next
  }
  return out
}

// ---------- locate the run and the implement step ----------

const workflowSpans = db
  .prepare(
    "SELECT name, startedAt, endedAt FROM mastra_ai_spans WHERE runId = ? AND spanType IN ('workflow_run','workflow_step') ORDER BY startedAt",
  )
  .all(runId)

const runSpan = workflowSpans.find((s) => s.name.startsWith('workflow run'))
if (!runSpan) {
  console.error(`No workflow run found for runId ${runId} in ${dbPath}`)
  process.exit(1)
}

const implementSpans = workflowSpans.filter((s) => s.name === IMPLEMENT_STEP)
if (implementSpans.length === 0) {
  console.error(`Run ${runId} has no '${IMPLEMENT_STEP}' span. Steps found:`)
  for (const s of workflowSpans) console.error(`  ${s.name}  ${s.startedAt} -> ${s.endedAt ?? 'running'}`)
  process.exit(1)
}
if (implementSpans.length > 1) {
  console.error(`note: ${implementSpans.length} implement spans found; analysing the last one`)
}
const implement = implementSpans[implementSpans.length - 1]
const implStart = toMs(implement.startedAt)
// startedAt and endedAt are stored as ISO text, so the query bounds stay strings.
const implEndIso = implement.endedAt ?? runSpan.endedAt ?? implement.startedAt
const implEnd = Math.max(toMs(implEndIso), implStart)
// The implementer thread is named after the issue, and the run id adds one more
// attempt number after it: run `issue-501-9` belongs to thread `issue-501-implementer`.
const issueMatch = /^(issue-\d+)/.exec(runId)
if (issueMatch === null) {
  console.error(`The run id ${runId} does not start with an issue number such as issue-501.`)
  process.exit(1)
}
const issuePrefix = issueMatch[1]

const threadRow = db
  .prepare(
    "SELECT threadId, COUNT(*) AS c FROM mastra_ai_spans WHERE threadId = ? AND startedAt BETWEEN ? AND ? GROUP BY threadId ORDER BY c DESC LIMIT 1",
  )
  .get(`${issuePrefix}-implementer`, implement.startedAt, implEndIso)
if (!threadRow) {
  console.error(`No implementer thread activity found inside the implement step of ${runId}`)
  process.exit(1)
}
const threadId = threadRow.threadId

const steps = workflowSpans
  .filter((s) => s.name.startsWith('workflow step'))
  .map((s) => `  ${s.name.replace(/^workflow step: '/, '').replaceAll("'", '')}: ${fmtDuration(toMs(s.endedAt ?? s.startedAt) - toMs(s.startedAt))}`)

// ---------- spans inside the implement step ----------

const spans = db
  .prepare(
    "SELECT name, spanType, spanId, isEvent, startedAt, endedAt, parentSpanId, entityName FROM mastra_ai_spans WHERE threadId = ? AND startedAt BETWEEN ? AND ?",
  )
  .all(threadId, implement.startedAt, implEndIso)

const toolSpans = spans.filter((s) => s.spanType === 'tool_call' && s.endedAt)
// Inference spans of the implementer agent itself; Observer and Reflector are
// background agents the factory runs on the same thread.
const inferenceSpans = spans.filter((s) => s.spanType === 'model_inference' && s.endedAt)
const implementerInferences = inferenceSpans.filter((s) => s.entityName === 'implementer')
const backgroundInferences = inferenceSpans.filter((s) => s.entityName && s.entityName !== 'implementer')
const backgroundAgents = [...new Set(backgroundInferences.map((s) => s.entityName))]
const generationSpans = spans.filter((s) => s.spanType === 'model_generation')

// Generations that were still open when the step ended. They were killed by the
// time limit (or crashed), and their recorded duration is dead time, not work.
const cutoff = implEnd
const hungSpans = inferenceSpans.filter(
  (s) => Math.abs(toMs(s.endedAt) - cutoff) <= 3_000 && toMs(s.endedAt) - toMs(s.startedAt) > 60_000,
)
const hung = unionIntervals(hungSpans.map((s) => ({ start: toMs(s.startedAt), end: toMs(s.endedAt) })))

const inferenceIdsWithToolCall = new Set(
  spans
    .filter((s) => s.spanType === 'model_chunk' && s.name.includes('tool-call'))
    .map((s) => s.parentSpanId),
)

function toolKind(name) {
  if (name.includes('execute_command')) return 'command'
  if (name.includes('write_file') || name.includes('edit_file')) return 'authoring'
  if (name.includes('read_file') || name.includes('list_files') || name.includes('grep') || name.includes('file_stat')) return 'reading'
  if (name.includes('get_process_output') || name.includes('kill_process')) return 'monitor'
  return 'other'
}

const intervals = {
  command: unionIntervals(toolSpans.filter((s) => toolKind(s.name) === 'command').map((s) => ({ start: toMs(s.startedAt), end: toMs(s.endedAt) }))),
  authoring: unionIntervals(toolSpans.filter((s) => toolKind(s.name) === 'authoring').map((s) => ({ start: toMs(s.startedAt), end: toMs(s.endedAt) }))),
  reading: unionIntervals(toolSpans.filter((s) => toolKind(s.name) === 'reading').map((s) => ({ start: toMs(s.startedAt), end: toMs(s.endedAt) }))),
  monitor: unionIntervals(toolSpans.filter((s) => toolKind(s.name) === 'monitor').map((s) => ({ start: toMs(s.startedAt), end: toMs(s.endedAt) }))),
  background: unionIntervals(backgroundInferences.map((s) => ({ start: toMs(s.startedAt), end: toMs(s.endedAt) }))),
}

// Hung and command-execution time are carved out of every other bucket so no
// time is double counted.
const hungI = hung
const commandI = subtractIntervals(intervals.command, hungI)

const windowLen = implEnd - implStart
const activityCandidates = spans.filter(
  (s) => s.endedAt && (s.spanType === 'tool_call' || (s.spanType === 'model_inference' && !hungSpans.includes(s))),
)
const lastActivity = activityCandidates.length === 0 ? null : Math.max(...activityCandidates.map((s) => toMs(s.endedAt)))
const deadTail = lastActivity === null ? null : implEnd - lastActivity

// ---------- messages inside the implement step ----------

const messageRows = db
  .prepare('SELECT content, "createdAt" FROM mastra_messages WHERE thread_id = ? ORDER BY "createdAt"')
  .all(threadId)

// One entry per recorded tool invocation, in chronological order.
const commands = []
const fileWrites = []
const askUserCalls = []

const verificationCategories = ['full gate (pnpm verify)', 'role check', 'lint', 'tests', 'typecheck', 'build']

function commandCategory(command) {
  if (/\bpnpm verify\b/.test(command)) return 'full gate (pnpm verify)'
  if (/\bnx .*role-check|role-enforcement-bin/.test(command)) return 'role check'
  if (/\bnx .*lint\b|eslint/.test(command)) return 'lint'
  if (/\bnx .*test\b|vitest/.test(command)) return 'tests'
  if (/\btsc\b|--noEmit|typecheck/.test(command)) return 'typecheck'
  if (/\bnx (run-many -t )?build\b/.test(command)) return 'build'
  if (/\bnx sync\b|pnpm (install|add)/.test(command)) return 'install/sync'
  if (/\bgit\b/.test(command)) return 'git'
  return 'other'
}

function looksFailed(output, exitCode) {
  if (typeof exitCode === 'number') return exitCode !== 0
  return /exit code [1-9]|exited with non-zero|command failed|ELIFECYCLE/i.test(output)
}

const specPattern = /(\.spec\.ts|\.test\.tsx?|__fixtures__|\/test\/|\/tests\/)/

for (const row of messageRows) {
  const at = Number.isFinite(Number(row.createdAt)) ? Number(row.createdAt) : toMs(row.createdAt)
  if (!Number.isFinite(at) || at < implStart - 60_000 || at > implEnd + 60_000) continue
  let message
  try {
    message = JSON.parse(row.content)
  } catch {
    continue
  }
  for (const part of message.parts ?? []) {
    if (part.type === 'tool-invocation' && part.toolInvocation) {
      const { toolName, args, result } = part.toolInvocation
      const output = typeof result === 'string' ? result : JSON.stringify(result ?? '')
      if (toolName === 'mastra_workspace_execute_command' && typeof args?.command === 'string') {
        commands.push({
          command: args.command,
          output,
          exitCode: part.toolInvocation.exitCode,
          at,
          category: commandCategory(args.command),
        })
      }
      if (toolName === 'mastra_workspace_write_file' || toolName === 'mastra_workspace_edit_file') {
        fileWrites.push({
          path: args?.path ?? '(unknown)',
          op: toolName === 'mastra_workspace_write_file' ? 'write' : 'edit',
          at,
          error: /not found|must match|did not match|no match|old_string/i.test(output) && /error|not found|must match|did not match/i.test(output),
        })
      }
      if (toolName === 'ask-user') askUserCalls.push({ at, question: args?.question ?? '' })
    }
  }
}

// Attach wall-time durations to commands by pairing each execute_command span
// with the nearest recorded invocation (the transcript row lands at completion).
const commandSpans = toolSpans.filter((s) => toolKind(s.name) === 'command').sort((a, b) => toMs(a.startedAt) - toMs(b.startedAt))
const sortedCommands = [...commands].sort((a, b) => a.at - b.at)
const paired = []
const pairedSpanIds = new Set()
const commandSpanCategory = new Map()
const usedInvocations = new Set()
for (const span of commandSpans) {
  const end = toMs(span.endedAt)
  let best = null
  let bestDelta = Infinity
  for (const invocation of sortedCommands) {
    if (usedInvocations.has(invocation)) continue
    const delta = Math.abs(invocation.at - end)
    if (delta < bestDelta && delta <= 30_000) {
      best = invocation
      bestDelta = delta
    }
  }
  if (best) {
    usedInvocations.add(best)
    pairedSpanIds.add(span)
    commandSpanCategory.set(span, best.category)
    paired.push({ ...best, duration: toMs(span.endedAt) - toMs(span.startedAt) })
  }
}

// ---------- analysis over commands, edits, rework ----------

const verification = paired.filter((c) => verificationCategories.includes(c.category))

const categoryStats = new Map()
for (const c of paired) {
  const stat = categoryStats.get(c.category) ?? { runs: 0, failed: 0, total: 0 }
  stat.runs += 1
  if (looksFailed(c.output, c.exitCode)) stat.failed += 1
  stat.total += c.duration
  categoryStats.set(c.category, stat)
}

const failedCommandStats = new Map()
for (const c of paired) {
  if (!looksFailed(c.output, c.exitCode)) continue
  const key = c.command.trim()
  const stat = failedCommandStats.get(key) ?? { count: 0, duration: 0, category: c.category }
  stat.count += 1
  stat.duration += c.duration
  failedCommandStats.set(key, stat)
}
const failedCommands = [...failedCommandStats.entries()].sort(
  (a, b) => b[1].count - a[1].count || b[1].duration - a[1].duration,
)

// Rework windows: from a failed verification until the next verification of the
// same category starts. The edits inside that window are the fix attempt.
const reworkWindows = []
for (const failure of verification.filter((c) => looksFailed(c.output, c.exitCode))) {
  const next = verification
    .filter((c) => c.category === failure.category && c.at > failure.at)
    .sort((a, b) => a.at - b.at)[0]
  if (!next) continue
  const editsInside = fileWrites.filter((w) => w.at > failure.at && w.at < next.at)
  reworkWindows.push({
    category: failure.category,
    start: failure.at,
    end: next.at,
    duration: Math.max(next.at - failure.at, 0),
    edits: editsInside.length,
    command: failure.command,
  })
}

const editsByPath = new Map()
for (const w of fileWrites) {
  const stat = editsByPath.get(w.path) ?? { writes: 0, edits: 0, errors: 0, isTest: specPattern.test(w.path) }
  if (w.op === 'write') stat.writes += 1
  else stat.edits += 1
  if (w.error) stat.errors += 1
  editsByPath.set(w.path, stat)
}
const topChurn = [...editsByPath.entries()]
  .map(([path, stat]) => ({ path, ...stat, total: stat.writes + stat.edits }))
  .sort((a, b) => b.total - a.total)
  .slice(0, 8)

const editFailures = fileWrites.filter((w) => w.error).length
const testTouchCount = [...editsByPath.entries()].filter(([path]) => specPattern.test(path)).reduce((sum, [, s]) => sum + s.writes + s.edits, 0)
const codeTouchCount = [...editsByPath.entries()].filter(([path]) => !specPattern.test(path)).reduce((sum, [, s]) => sum + s.writes + s.edits, 0)

// Classify every authoring span as tests/fixtures or code. The paired
// transcript path is authoritative; the nearest write is the fallback.
const authoringSpans = toolSpans.filter((s) => toolKind(s.name) === 'authoring')
const sortedWrites = [...fileWrites].sort((a, b) => a.at - b.at)
const authoringSpanIsTest = new Map()
for (const span of authoringSpans) {
  const end = toMs(span.endedAt)
  let best = null
  let bestDelta = Infinity
  for (const w of sortedWrites) {
    const delta = Math.abs(w.at - end)
    if (delta < bestDelta) {
      best = w
      bestDelta = delta
    }
  }
  authoringSpanIsTest.set(span, best && bestDelta <= 60_000 ? specPattern.test(best.path) : false)
}

// Category for any command span, falling back to the nearest paired command.
const pairedTimeline = paired.map((c) => ({ at: c.at, category: c.category }))
function categoryForCommandSpan(span) {
  const known = commandSpanCategory.get(span)
  if (known) return known
  const mid = (toMs(span.startedAt) + toMs(span.endedAt)) / 2
  let best = null
  let bestDelta = Infinity
  for (const p of pairedTimeline) {
    const delta = Math.abs(p.at - mid)
    if (delta < bestDelta) {
      best = p
      bestDelta = delta
    }
  }
  return best && bestDelta <= 180_000 ? best.category : 'unknown'
}

// ---------- classify every implementer turn by what it was doing ----------
//
// Each model turn carries its tool calls as child spans, so the turn's tools
// say what the turn was for: writing code, writing tests, exploring, running
// checks, or thinking without acting. Turns count once, by their dominant
// tools; command execution time is carved out so it appears only in the
// command bucket.

const purposeIntervals = { code: [], tests: [], explore: [], checks: [], thinking: [] }
for (const inf of implementerInferences) {
  if (hungSpans.includes(inf)) continue
  const start = toMs(inf.startedAt)
  const end = toMs(inf.endedAt)
  const inside = toolSpans.filter((t) => {
    const mid = (toMs(t.startedAt) + toMs(t.endedAt)) / 2
    return mid >= start && mid <= end
  })
  const authoring = inside.filter((t) => toolKind(t.name) === 'authoring')
  const commandsInTurn = inside.filter((t) => toolKind(t.name) === 'command')
  if (authoring.length > 0) {
    const testCount = authoring.filter((t) => authoringSpanIsTest.get(t)).length
    purposeIntervals[testCount > authoring.length / 2 ? 'tests' : 'code'].push({ start, end })
  } else if (commandsInTurn.length > 0) {
    const isCheck = commandsInTurn.some((t) => verificationCategories.includes(categoryForCommandSpan(t)))
    purposeIntervals[isCheck ? 'checks' : 'explore'].push({ start, end })
  } else if (inside.length > 0) {
    purposeIntervals.explore.push({ start, end })
  } else {
    purposeIntervals.thinking.push({ start, end })
  }
}

const codeI = subtractIntervals(unionIntervals(purposeIntervals.code), [...hungI, ...commandI])
const testsI = subtractIntervals(unionIntervals(purposeIntervals.tests), [...hungI, ...commandI])
const exploreI = subtractIntervals(unionIntervals(purposeIntervals.explore), [...hungI, ...commandI])
const thinkingI = subtractIntervals(unionIntervals(purposeIntervals.thinking), [...hungI, ...commandI])
const checksI = subtractIntervals(unionIntervals([...purposeIntervals.checks, ...intervals.command]), hungI)
const backgroundI = subtractIntervals(intervals.background, [...hungI, ...codeI, ...testsI, ...exploreI, ...checksI, ...thinkingI])
const active = unionIntervals([...codeI, ...testsI, ...exploreI, ...checksI, ...thinkingI, ...hungI, ...backgroundI])
const idleIntervals = subtractIntervals([{ start: implStart, end: implEnd }], active)
const idleGaps = idleIntervals.filter((i) => i.end - i.start >= 30_000)

// Rework is carved out of coding, testing and checks so each row in the table
// is clean time and nothing is double counted.
const reworkWindowsU = unionIntervals(reworkWindows.map((w) => ({ start: w.start, end: w.end })))
const reworkI = subtractIntervals(intersectIntervals(unionIntervals([...codeI, ...testsI, ...checksI]), reworkWindowsU), hungI)
const cleanCodeI = subtractIntervals(codeI, reworkI)
const cleanTestsI = subtractIntervals(testsI, reworkI)
const cleanChecksI = subtractIntervals(checksI, reworkI)
const reworkTotal = totalOf(reworkI)

// ---------- stuck signals ----------

const reasoningOnly = implementerInferences
  .filter((s) => !inferenceIdsWithToolCall.has(s.spanId) && Math.abs(toMs(s.endedAt) - cutoff) > 3_000)
  .map((s) => ({ start: s.startedAt, duration: toMs(s.endedAt) - toMs(s.startedAt) }))
  .sort((a, b) => b.duration - a.duration)
const longThinking = reasoningOnly.filter((r) => r.duration >= 60_000)

const failedRequestFiles = []
try {
  for (const name of readdirSync(logsDir)) {
    if (!name.endsWith('-failed-request.json')) continue
    const mtime = statSync(join(logsDir, name)).mtimeMs
    if (mtime >= implStart - 60_000 && mtime <= implEnd + 60_000) {
      failedRequestFiles.push(name)
    }
  }
} catch {
  // logs directory missing; skip
}

// ---------- report ----------

const models = [...new Set(generationSpans.map((s) => s.name.replace(/^llm: '/, '').replaceAll("'", '')))]
const lines = []
const h = (text) => lines.push(text)

const runOutcomeLine = (() => {
  try {
    const logLines = readFileSync(join(logsDir, 'runs.log'), 'utf8').split('\n').filter((l) => l.includes(runId))
    const parts = (logLines[logLines.length - 1] ?? '').split(' ')
    const status = parts[3] ?? 'unknown'
    const message = parts.slice(4).join(' ')
    return `${status}. ${message || 'no reason recorded'}`
  } catch {
    return 'unknown. No runs.log was found'
  }
})()

h(`# Session analysis: ${runId}`)
h('')
h('| | |')
h('|---|---|')
h(`| **Outcome** | ${runOutcomeLine} |`)
h(`| **Run window** | ${timeOf(runSpan.startedAt)} → ${timeOf(runSpan.endedAt ?? runSpan.startedAt)} (${fmtDuration(toMs(runSpan.endedAt ?? runSpan.startedAt) - toMs(runSpan.startedAt))}) |`)
h(`| **Implement step** | ${timeOf(implement.startedAt)} → ${timeOf(implement.endedAt ?? implement.startedAt)} (${fmtDuration(windowLen)}) |`)
h(`| **Model** | ${models.join(', ') || 'unknown'} |`)
h(`| **What the implementer did** | ${implementerInferences.length} model turns, ${fileWrites.length} file writes or edits, ${commandSpans.length} commands |`)
h(`| **Where these numbers come from** | \`node scripts/analyze-session.mjs ${runId}\`. They are inferred from session data, so they are estimates. |`)
h('')
h('## Workflow steps')
h('')
for (const step of steps) h(`- ${step.trim()}`)
h('')

h('## Where the time went')
h('')
h('| activity | time | share |')
h('|---|---|---|')
h(`| coding new code | ${fmtDuration(totalOf(cleanCodeI))} | ${fmtPct(totalOf(cleanCodeI), windowLen)} |`)
h(`| writing tests | ${fmtDuration(totalOf(cleanTestsI))} | ${fmtPct(totalOf(cleanTestsI), windowLen)} |`)
h(`| waiting for commands | ${fmtDuration(totalOf(cleanChecksI))} | ${fmtPct(totalOf(cleanChecksI), windowLen)} |`)
h(`| reworking after failed checks | ${fmtDuration(reworkTotal)} | ${fmtPct(reworkTotal, windowLen)} |`)
h(`| exploring the codebase | ${fmtDuration(totalOf(exploreI))} | ${fmtPct(totalOf(exploreI), windowLen)} |`)
h(`| thinking without acting | ${fmtDuration(totalOf(thinkingI))} | ${fmtPct(totalOf(thinkingI), windowLen)} |`)
h(`| stuck on requests that never returned | ${fmtDuration(totalOf(hungI))} | ${fmtPct(totalOf(hungI), windowLen)} |`)
h(`| background agents (${backgroundAgents.join(', ') || 'none'}) | ${fmtDuration(totalOf(backgroundI))} | ${fmtPct(totalOf(backgroundI), windowLen)} |`)
h(`| idle | ${fmtDuration(totalOf(idleIntervals))} | ${fmtPct(totalOf(idleIntervals), windowLen)} |`)
h('')
h('- The rows do not overlap. They add up to the step total.')
h('- Each model turn is classified by the tools it ran. Writes and edits decide code versus tests. Commands decide checks versus exploring. A turn with no tools is thinking.')
h('- File writes run in milliseconds. The effort of writing shows up in the turn buckets.')
h('')

h('## Checks')
h('')
h('| check | runs | failed | wall time |')
h('|---|---|---|---|')
for (const category of verificationCategories) {
  const runs = verification.filter((c) => c.category === category)
  const failedCount = runs.filter((c) => looksFailed(c.output, c.exitCode)).length
  h(`| ${category} | ${runs.length} | ${failedCount} | ${fmtDuration(runs.reduce((sum, c) => sum + c.duration, 0))} |`)
}
h('')
h(`- ${verification.length} checks against ${fileWrites.length} file writes or edits. Zero runs means the check never ran in this step.`)
h('')

h('## Commands')
h('')
h('| category | runs | failed | total time |')
h('|---|---|---|---|')
const sortedCategories = [...categoryStats.entries()].sort((a, b) => b[1].total - a[1].total)
for (const [category, stat] of sortedCategories) {
  h(`| ${category} | ${stat.runs} | ${stat.failed} | ${fmtDuration(stat.total)} |`)
}
const allCommandMs = totalOf(commandI)
const uncategorised = commandSpans.length - paired.length
const uncategorisedMs = totalOf(
  unionIntervals(
    commandSpans.filter((s) => !pairedSpanIds.has(s)).map((s) => ({ start: toMs(s.startedAt), end: toMs(s.endedAt) })),
  ),
)
h('')
h(`- ${commandSpans.length} commands ran, for ${fmtDuration(allCommandMs)} in total.`)
if (uncategorised > 0) h(`- ${uncategorised} commands (${fmtDuration(uncategorisedMs)}) have no result in the transcript. Their turns aborted and the results were lost.`)
h('')

h('## Slowest commands')
h('')
for (const c of [...paired].sort((a, b) => b.duration - a.duration).slice(0, 5)) {
  h(`- ${fmtDuration(c.duration)} — ${c.command.slice(0, 110)}${c.command.length > 110 ? '…' : ''}`)
}
h('')

h('## Failed commands')
h('')
h('| failures | category | command |')
h('|---|---|---|')
for (const [command, stat] of failedCommands) {
  const short = command.length > 100 ? `${command.slice(0, 100)}…` : command
  h(`| ${stat.count} | ${stat.category} | ${short.replaceAll('|', '\\|')} |`)
}
h('')

h('## Rework')
h('')
h(`Every failed check starts a fix loop. This table shows each failing command and how long it took until the same check passed again. Across the whole implement step, ${codeTouchCount} writes touched code and ${testTouchCount} touched tests or fixtures; these counts include writes outside fix loops. ${editFailures} writes failed an edit because the old text was not found.`)
h('')
h('| failed check | command | failures | first failed at | passed again after |')
h('|---|---|---|---|---|')
const incidentStats = new Map()
for (const c of verification.filter((c) => looksFailed(c.output, c.exitCode))) {
  const key = c.command.trim()
  const stat = incidentStats.get(key) ?? { count: 0, firstAt: c.at, category: c.category }
  stat.count += 1
  incidentStats.set(key, stat)
}
const passesByCategory = new Map()
for (const c of verification.filter((c) => !looksFailed(c.output, c.exitCode))) {
  const passes = passesByCategory.get(c.category) ?? []
  passes.push(c.at)
  passesByCategory.set(c.category, passes)
}
for (const [command, stat] of [...incidentStats.entries()].sort((a, b) => b[1].count - a[1].count)) {
  const passes = passesByCategory.get(stat.category) ?? []
  const nextPass = passes.find((at) => at >= stat.firstAt)
  const gap = nextPass !== undefined ? nextPass - stat.firstAt : null
  let passedAfter = 'never passed in this step'
  if (gap !== null) {
    passedAfter = gap < 1_000 ? 'under 1s' : fmtDuration(gap)
  }
  const short = command.length > 80 ? `${command.slice(0, 80)}…` : command
  h(`| ${stat.category} | ${short.replaceAll('|', '\\|')} | ${stat.count} | ${timeOf(stat.firstAt)} | ${passedAfter} |`)
}
h('')
if (topChurn.length > 0) {
  h('Most edited files:')
  h('')
  for (const f of topChurn) {
    const failedEdits = f.errors ? `, ${f.errors} failed edits` : ''
    const testTag = f.isTest ? '[test] ' : ''
    h(`- ${f.total} times (${f.writes} ${f.writes === 1 ? 'write' : 'writes'}, ${f.edits} ${f.edits === 1 ? 'edit' : 'edits'}${failedEdits}) ${testTag}\`${f.path}\``)
  }
  h('')
}

h('## Stuck signals')
h('')
h('| | |')
h('|---|---|')
h(`| **Reasoning-only turns (no tool call)** | ${reasoningOnly.length} |`)
h(`| **Turns over 1 minute of pure reasoning** | ${longThinking.length} |`)
for (const r of longThinking.slice(0, 3)) h(`| **Long reasoning turn** | ${fmtDuration(r.duration)}, started ${timeOf(r.start)} |`)
h(`| **Generations still open when the step ended** | ${hungSpans.length} |`)
for (const s of hungSpans.slice(0, 4)) h(`| **Stuck generation** | ${s.entityName ?? 'unknown'}, ${fmtDuration(toMs(s.endedAt) - toMs(s.startedAt))}, opened ${timeOf(s.startedAt)} |`)
h(`| **Last recorded activity** | ${lastActivity === null ? 'none recorded inside the step' : `${timeOf(lastActivity)}, ${fmtDuration(deadTail)} before the step ended`} |`)
h(`| **Idle gaps over 30s** | ${idleGaps.length}, ${fmtDuration(totalOf(idleGaps))} in total |`)
h(`| **Background agent turns** | ${backgroundInferences.length} |`)
h(`| **Provider rejected requests** | ${failedRequestFiles.length} |`)
h(`| **Questions asked to the developer** | ${askUserCalls.length} |`)
h('')

h('## Data gaps')
h('')
h('- Span payloads are truncated binary blobs, so token usage and exact prompts are not included.')
h('- Categories are inferred from tool names, command text and file paths. Spot-check surprising numbers against the transcript before acting on them.')
h('')

const report = lines.join('\n')
const analysisDir = join(dirname(dbPath), 'analysis')
mkdirSync(analysisDir, { recursive: true })
const reportPath = join(analysisDir, `${runId}.md`)

// The script owns the stats part of the file. Analysis sections that were
// appended later (What caused the numbers, Improvement suggestions) are kept
// when the stats are regenerated.
let content = `${report}\n`
try {
  const existing = readFileSync(reportPath, 'utf8')
  const analysisStart = existing.indexOf('\n## What caused the numbers')
  if (analysisStart !== -1) {
    content += existing.slice(analysisStart + 1)
  }
} catch {
  // no existing report yet
}
writeFileSync(reportPath, content)
console.log(report)
console.error(`\nStats report written to ${reportPath}`)
console.error('Add the two analysis sections (What caused the numbers, Improvement suggestions) to this file, following the skill format.')
