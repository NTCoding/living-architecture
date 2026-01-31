import {
  readFile, writeFile 
} from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import {
  success, failure 
} from '../../../../platform/domain/workflow-execution/step-result'
import type { CompleteTaskContext } from '../task-to-complete'
import {
  taskCheckMarkerExists, createTaskCheckMarker 
} from '../task-check-marker'

export class AgentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgentError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

const VALID_VERDICTS = ['PASS', 'FAIL'] as const
const verdictSchema = z.enum(VALID_VERDICTS)
type Verdict = z.infer<typeof verdictSchema>

interface ReviewerResult {
  result: Verdict
  name: string
  reportPath: string
}

const VALID_REVIEWERS = ['code-review', 'bug-scanner', 'task-check'] as const
type ReviewerName = (typeof VALID_REVIEWERS)[number]

export interface CodeReviewDeps {
  skipReview: boolean
  baseBranch: () => Promise<string>
  unpushedFiles: (baseBranch: string) => Promise<string[]>
  queryAgentText: (opts: {
    prompt: string
    model: 'opus' | 'sonnet' | 'haiku'
    settingSources?: ('user' | 'project' | 'local')[]
  }) => Promise<string>
}

function getReviewerNames(hasIssue: boolean, reviewDir: string): readonly ReviewerName[] {
  const shouldRunTaskCheck = hasIssue && !taskCheckMarkerExists(reviewDir)
  return ['code-review', 'bug-scanner', ...(shouldRunTaskCheck ? (['task-check'] as const) : [])]
}

async function loadAgentInstructions(agentPath: string): Promise<string> {
  try {
    return await readFile(agentPath, 'utf-8')
  } catch (error) {
    /* v8 ignore start - Node.js fs errors are always Error instances */
    throw new AgentError(
      `Failed to read agent prompt at ${agentPath}: ${error instanceof Error ? error.message : String(error)}`,
    )
    /* v8 ignore stop */
  }
}

interface AgentResponse {
  verdict: Verdict
  report: string
}

function extractVerdict(line: string): Verdict | undefined {
  const stripped = line.trim().replaceAll(/\*+/g, '').trim()
  const match = /\b(PASS|FAIL)\b/.exec(stripped)
  const parsed = verdictSchema.safeParse(match?.[1])
  return parsed.success ? parsed.data : undefined
}

function parseAgentResponse(raw: string): AgentResponse {
  const lines = raw.split('\n')
  const verdictIndex = lines.findIndex((line) => extractVerdict(line) !== undefined)

  if (verdictIndex < 0) {
    const preview = lines.slice(0, 3).join(' | ')
    throw new AgentError(`Agent response must contain PASS or FAIL. Got: "${preview}"`)
  }

  const verdict = extractVerdict(lines[verdictIndex])
  /* v8 ignore next -- @preserve: verdictIndex >= 0 guarantees extractVerdict returns a value */
  if (verdict === undefined) throw new AgentError('Verdict extraction failed unexpectedly')
  return {
    verdict,
    report: lines.slice(verdictIndex + 1).join('\n'),
  }
}

export function createCodeReviewStep(deps: CodeReviewDeps): Step<CompleteTaskContext> {
  return {
    name: 'code-review',
    execute: async (ctx) => {
      if (deps.skipReview) {
        return success()
      }

      if (!ctx.reviewDir) {
        return failure({
          type: 'fix_errors',
          details: 'Missing required context: reviewDir',
        })
      }

      const baseBranch = await deps.baseBranch()
      const filesToReview = await deps.unpushedFiles(baseBranch)

      const reviewerNames = getReviewerNames(ctx.hasIssue, ctx.reviewDir)

      const resultsOrFailure = await executeCodeReviewAgents(
        deps,
        reviewerNames,
        filesToReview,
        ctx.reviewDir,
        ctx.taskDetails,
      ).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        return failure({
          type: 'fix_errors',
          details: `Code review agent failed: ${message}. Re-run /complete-task to retry.`,
        })
      })

      if (!Array.isArray(resultsOrFailure)) {
        return resultsOrFailure
      }

      const failures = resultsOrFailure.filter((r) => r.result === 'FAIL')
      if (failures.length > 0) {
        return failure({
          type: 'fix_review',
          details: failures.map((f) => ({
            name: f.name,
            reportPath: f.reportPath,
          })),
        })
      }

      return success()
    },
  }
}

function nextRoundNumber(reviewDir: string, name: string): number {
  try {
    const prefix = `${name}-`
    const suffix = '.md'
    const files = readdirSync(reviewDir)
    const rounds = files
      .filter((f) => f.startsWith(prefix) && f.endsWith(suffix))
      .map((f) => parseInt(f.slice(prefix.length, -suffix.length), 10))
      .filter((n) => !Number.isNaN(n))
    return rounds.length > 0 ? Math.max(...rounds) + 1 : 1
  } catch {
    return 1
  }
}

async function executeCodeReviewAgents(
  deps: CodeReviewDeps,
  names: readonly ReviewerName[],
  filesToReview: string[],
  reviewDir: string,
  taskDetails?: {
    title: string
    body: string
  },
): Promise<ReviewerResult[]> {
  const validReviewerSet = new Set<string>(VALID_REVIEWERS)

  return Promise.all(
    names.map(async (name) => {
      /* v8 ignore start - defensive check, names from const array are always valid */
      if (!validReviewerSet.has(name)) {
        throw new AgentError(
          `Invalid reviewer name: ${name}. Must be one of: ${VALID_REVIEWERS.join(', ')}`,
        )
      }
      /* v8 ignore stop */

      const agentPath = `.claude/agents/${name}.md`
      const basePrompt = await loadAgentInstructions(agentPath)
      const round = nextRoundNumber(reviewDir, name)
      const reportPath = resolve(`${reviewDir}/${name}-${round}.md`)

      const promptParts = [basePrompt, '\n\n## Files to Review\n\n', filesToReview.join('\n')]

      if (name === 'task-check' && taskDetails) {
        promptParts.push(
          `\n\n## Task Details\n\nTitle: ${taskDetails.title}\n\nBody:\n${taskDetails.body}`,
        )
      }

      const rawResponse = await deps.queryAgentText({
        prompt: promptParts.join(''),
        model: 'opus',
        settingSources: ['project'],
      })

      const parsed = parseAgentResponse(rawResponse)

      await writeFile(reportPath, parsed.report, 'utf-8')

      if (name === 'task-check' && parsed.verdict === 'PASS') {
        await createTaskCheckMarker(reviewDir)
      }

      return {
        result: parsed.verdict,
        name,
        reportPath,
      }
    }),
  )
}
