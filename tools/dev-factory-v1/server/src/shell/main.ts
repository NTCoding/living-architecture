#!/usr/bin/env node
import './configure-mastra-runtime'
import { mkdirSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { Command } from 'commander'
import type { Workflow } from '@mastra/core/workflows'
import { ListRuns } from '@dev-factory-v1/use-cases/queries/list-runs'
import { ShowRun } from '@dev-factory-v1/use-cases/queries/show-run'
import type { RunView } from '@dev-factory-v1/use-cases/queries/show-run'
import { ParseReviewers } from '@dev-factory-v1/use-cases/commands/parse-reviewers'
import { ResumeRun } from '@dev-factory-v1/use-cases/commands/resume-run'
import { StartRun } from '@dev-factory-v1/use-cases/commands/start-run'
import { addAgentCommands } from './agent-commands'
import { buildFactory } from './build-factory'
import { pinObservationalMemoryModels } from './pin-observational-memory-models'

type Factory = Awaited<ReturnType<typeof buildFactory>>

type Waiting = NonNullable<RunView['waiting']>

function readTargetRepo(): string | undefined {
  const targetRepo = process.env['FACTORY_TARGET_REPO']
  if (targetRepo === undefined || targetRepo === '') {
    process.stderr.write(
      "FACTORY_TARGET_REPO is not set. Run the factory through ./start-factory-ui or the repo's pnpm factory script.\n",
    )
    return undefined
  }
  return targetRepo
}

/**
 * @riviere-role main
 */
export async function main(argv: readonly string[]): Promise<number> {
  const targetRepo = readTargetRepo()
  if (targetRepo === undefined) return 1
  const workingDirectory = targetRepo
  loadLocalEnvironment(workingDirectory)
  mkdirSync(`${workingDirectory}/.factory`, { recursive: true })
  const factory = await buildFactory(workingDirectory)
  const program = createCommandLine(factory)
  try {
    await program.parseAsync(['node', 'factory', ...argv])
    return 0
  } catch (error) {
    const exitCode = commanderExitCode(error)
    if (exitCode !== undefined) return exitCode
    process.stderr.write(`${String(error)}\n`)
    return 1
  } finally {
    // A short-lived CLI process would otherwise exit with spans still buffered.
    await factory.mastra.observability.flush()
  }
}

function createCommandLine(factory: Factory): Command {
  const program = new Command().name('factory')
  const showRun = new ShowRun(factory.workflowRuns)
  const startRun = new StartRun(factory.workflowRuns)
  const resumeRun = new ResumeRun(factory.workflowRuns)
  const listRuns = new ListRuns(factory.workflowRuns)
  addAgentCommands(program, {
    targetRepo: factory.workingDirectory,
    serverUrl: process.env['FACTORY_SERVER_URL'] ?? 'http://127.0.0.1:4800',
    write: (text) => {
      process.stdout.write(`${text}\n`)
    },
  })

  program
    .command('start-implementation')
    .description('start a run and follow it until it finishes or needs you')
    .argument('<issue>')
    .requiredOption('--model <model>', 'the model every agent in this run uses')
    .requiredOption('--observer-model <model>', 'the model the observational memory observer uses')
    .requiredOption('--thinking <level>', 'off, low, medium or high')
    .option(
      '--reviewers <names>',
      'comma-separated reviewers to run instead of all of them, any of architecture-review, code-review, bug-scanner',
    )
    .option('--no-input', 'never wait for an answer in this terminal')
    .action(
      async (
        issue: string,
        options: {
          model: string
          observerModel: string
          thinking: string
          reviewers?: string
          input: boolean
        },
      ) => {
        factory.setObservationalMemoryModel(options.observerModel)
        const reviewers = new ParseReviewers().execute({
          names: options.reviewers?.split(','),
        }).reviewers
        const started = await startRun.execute({
          issueNumber: issueNumber(issue),
          model: options.model,
          observerModel: options.observerModel,
          thinking: options.thinking,
          reviewers,
          worktreesDirectory: `${factory.workingDirectory}/.factory/worktrees`,
        })
        await follow(
          factory,
          started.runId,
          () => showRun.execute({ runId: started.runId }),
          async (_waiting, answer) => {
            await resumeRun.execute({ runId: started.runId, answer })
            return await showRun.execute({ runId: started.runId })
          },
          {
            issue: issueNumberText(issue),
            issueUrl: issueUrlOf(factory.repositoryUrl, issue),
            interactive: options.input,
          },
        )
      },
    )

  program
    .command('resume')
    .description('continue a run that is waiting for a person')
    .argument('<issue>')
    .option('--answer <answer>', 'the answer to a question the implementer asked')
    .option('--no-input', 'never wait for an answer in this terminal')
    .action(async (issue: string, options: { answer?: string; input: boolean }) => {
      const runId = await newestRunIdOf(listRuns, issue)
      const run = await factory.workflowRuns.read(runId)
      pinObservationalMemoryModels(run?.steps, factory, issue)
      const view = await showRun.execute({ runId })
      if (
        (view.waiting?.kind === 'implementer-question' || view.waiting?.kind === 'plan-question') &&
        options.answer === undefined
      ) {
        throw new MissingAnswer(issue)
      }
      const answer = options.answer ?? true
      await follow(
        factory,
        runId,
        async () => {
          await resumeRun.execute({ runId, answer })
          return await showRun.execute({ runId })
        },
        async (_waiting, resumedWith) => {
          await resumeRun.execute({ runId, answer: resumedWith })
          return await showRun.execute({ runId })
        },
        {
          issue: issueNumberText(issue),
          issueUrl: issueUrlOf(factory.repositoryUrl, issue),
          interactive: options.input,
        },
      )
    })

  program
    .command('read-implementers-plan')
    .description('print the plan the implementer wrote for a run')
    .argument('<issue>')
    .action(async (issue: string) => {
      const runId = await newestRunIdOf(listRuns, issue)
      const run = await factory.workflowRuns.read(runId)
      const plan = isRecord(run?.steps) ? planOf(run.steps['draft-plan']) : null
      process.stdout.write(
        plan === null ? `No plan has been written for issue ${issue} yet.\n` : `${plan}\n`,
      )
    })

  program
    .command('status')
    .description('list the runs that are waiting for a person')
    .action(async () => {
      const { runs } = await listRuns.execute({ status: 'suspended' })
      for (const run of runs) {
        process.stdout.write(`${run.runId} has waited since ${String(run.createdAt)}\n`)
      }
      if (runs.length === 0) process.stdout.write('Nothing is waiting for you.\n')
    })

  program
    .command('runs')
    .description('list every run')
    .action(async () => {
      const { runs } = await listRuns.execute({})
      for (const run of runs) {
        process.stdout.write(`${run.runId} ${run.status}\n`)
      }
      if (runs.length === 0) process.stdout.write('No runs yet.\n')
    })

  program
    .command('chat')
    .description('answer the implementer when it is waiting for a person')
    .argument('<issue>')
    .option('--no-input', 'never wait for an answer in this terminal')
    .action(async (issue: string, options: { input: boolean }) => {
      const runId = await newestRunIdOf(listRuns, issue)
      const run = await factory.workflowRuns.read(runId)
      pinObservationalMemoryModels(run?.steps, factory, issue)
      const view = await showRun.execute({ runId })
      if (
        (view.waiting?.kind !== 'implementer-question' && view.waiting?.kind !== 'plan-question') ||
        view.waiting.question === null
      ) {
        process.stdout.write(`The implementer is not waiting for an answer on issue ${issue}.\n`)
        return
      }
      process.stdout.write(
        `The implementer asks:\n\n  ${view.waiting.question}\n\nType an answer, or exit.\n`,
      )
      const terminal = createInterface({ input: process.stdin, output: process.stdout })
      try {
        const answer = await terminal.question('> ')
        if (answer.trim() === 'exit') return
        await follow(
          factory,
          runId,
          async () => {
            await resumeRun.execute({ runId, answer })
            return await showRun.execute({ runId })
          },
          async (_waiting, resumedWith) => {
            await resumeRun.execute({ runId, answer: resumedWith })
            return await showRun.execute({ runId })
          },
          {
            issue: issueNumberText(issue),
            issueUrl: issueUrlOf(factory.repositoryUrl, issue),
            interactive: options.input,
          },
        )
      } finally {
        terminal.close()
      }
    })

  return program
}

async function newestRunIdOf(listRuns: ListRuns, issue: string): Promise<string> {
  const { runs } = await listRuns.execute({})
  const base = `issue-${String(issueNumber(issue))}`
  const newest = runs
    .map((run) => run.runId)
    .filter((runId) => attemptOf(runId, base) > 0)
    .reduce<string>(
      (chosen, runId) => (attemptOf(runId, base) > attemptOf(chosen, base) ? runId : chosen),
      base,
    )
  return newest
}

function attemptOf(runId: string, base: string): number {
  if (runId === base) return 1
  if (!runId.startsWith(`${base}-`)) return 0
  const attempt = Number(runId.slice(base.length + 1))
  return Number.isInteger(attempt) && attempt > 0 ? attempt : 0
}

type RunContext = {
  readonly issue: string
  readonly issueUrl: string
  readonly interactive: boolean
}

async function follow(
  factory: Factory,
  runId: string,
  begin: () => Promise<RunView>,
  resume: (waiting: Waiting, answer: string | boolean) => Promise<RunView>,
  context: RunContext,
): Promise<void> {
  const stop = watch(factory.startImplementation, factory.reviewCycle, runId)
  const outcome: { current: RunView } = { current: await begin() }
  for (;;) {
    if (outcome.current.status === 'success') {
      await stop()
      reportEnded(outcome.current)
      return
    }
    if (outcome.current.status !== 'suspended') {
      await stop()
      reportFailure(outcome.current)
      return
    }
    const waiting = outcome.current.waiting
    if (waiting === null) {
      await stop()
      reportWaiting(null, context)
      process.exitCode = 3
      return
    }
    showWaiting(waiting)
    reportWaiting(waiting, context)
    if (!context.interactive) {
      await stop()
      process.exitCode = 3
      return
    }
    const answer = await ask(waiting)
    if (answer === null) {
      await stop()
      process.exitCode = 3
      return
    }
    outcome.current = await resume(waiting, answer)
  }
}

type StepTiming = {
  reported: boolean
  lastHeartbeat: number
  iteration: number
  lastStartedAt: number
}

async function reportNested(
  reviewCycle: Workflow,
  runId: string,
  timings: Map<string, StepTiming>,
): Promise<void> {
  for (const cycle of [1, 2, 3]) {
    const nestedId = `${runId}-review-${String(cycle)}`
    const state = await reviewCycle.getWorkflowRunById(nestedId)
    if (state === null) continue
    reportSteps(state.steps, timings, nestedId, '    ')
  }
}

function reportSteps(
  steps: unknown,
  timings: Map<string, StepTiming>,
  prefix = '',
  indent = '  ',
): void {
  if (!isRecord(steps)) return
  const now = Date.now()
  for (const [name, value] of Object.entries(steps)) {
    reportStep(name, value, timings, prefix, indent, now)
  }
}

function reportStep(
  name: string,
  value: unknown,
  timings: Map<string, StepTiming>,
  prefix: string,
  indent: string,
  now: number,
): void {
  const step: unknown = Array.isArray(value) ? value[0] : value
  if (!isRecord(step)) return
  const status = typeof step['status'] === 'string' ? step['status'] : 'unknown'
  const startedAt = timestampOf(step['startedAt']) ?? now
  const endedAt = timestampOf(step['endedAt']) ?? now
  const key = `${prefix}${name}`
  const timing = timings.get(key) ?? {
    reported: false,
    lastHeartbeat: now,
    iteration: 1,
    lastStartedAt: startedAt,
  }
  if (name === 'review-cycle' && timing.lastStartedAt !== startedAt) {
    timing.iteration += 1
    timing.lastStartedAt = startedAt
  }
  timings.set(key, timing)
  const label = name === 'review-cycle' ? `review-cycle (cycle ${String(timing.iteration)})` : name
  if (status === 'running') {
    heartbeatTime(indent, label, timing, startedAt, now)
    return
  }
  if (timing.reported) return
  timing.reported = true
  process.stdout.write(
    `${indent}${markOf(status)} ${label.padEnd(26)} ${duration(startedAt, endedAt)}\n`,
  )
}

function timestampOf(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function heartbeatTime(
  indent: string,
  name: string,
  timing: StepTiming,
  startedAt: number,
  now: number,
): void {
  if (now - startedAt < 300_000) return
  if (now - timing.lastHeartbeat < 300_000) return
  timing.lastHeartbeat = now
  process.stdout.write(`${indent}… ${name.padEnd(26)} ${duration(startedAt, now)}\n`)
}

function duration(from: number, to: number): string {
  const seconds = Math.max(0, Math.round((to - from) / 1000))
  if (seconds < 60) return `${String(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes)}m ${String(seconds % 60).padStart(2, '0')}s`
}

function watch(workflow: Workflow, nested: Workflow, runId: string): () => Promise<void> {
  const timings = new Map<string, StepTiming>()
  const control = { stopped: false, ticking: false }
  const tick = async (): Promise<void> => {
    if (control.stopped) return
    control.ticking = true
    try {
      const state = await workflow.getWorkflowRunById(runId)
      reportSteps(state?.steps, timings)
      await reportNested(nested, runId, timings)
    } finally {
      control.ticking = false
    }
    if (!control.stopped) setTimeout(() => void tick(), 3_000)
  }
  void tick()
  return async () => {
    control.stopped = true
    while (control.ticking) await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

function markOf(status: string): string {
  if (status === 'success') return '✓'
  if (status === 'failed') return '✗'
  if (status === 'suspended') return '…'
  return '·'
}

function asksAQuestion(
  waiting: Waiting,
): waiting is Extract<Waiting, { readonly question: string | null }> {
  return waiting.kind === 'implementer-question' || waiting.kind === 'plan-question'
}

function showWaiting(waiting: Waiting): void {
  if (asksAQuestion(waiting)) {
    if (waiting.question !== null) {
      process.stdout.write(`\nThe implementer asks:\n\n  ${waiting.question}\n`)
    }
    return
  }
  process.stdout.write(`\nThe implementer could not answer every finding.\n\n${waiting.reason}\n`)
  const unaddressed = waiting.unaddressed ?? []
  if (unaddressed.length > 0) {
    process.stdout.write(`\nThe implementer did not answer findings: ${unaddressed.join(', ')}\n`)
  }
}

function reportWaiting(waiting: Waiting | null, context: RunContext): void {
  const resume = `pnpm factory resume ${context.issue}`
  process.stdout.write(`\nThe run is waiting for you.\n\n`)
  if (waiting === null) {
    process.stdout.write(`  What is waiting:    pnpm factory status\n`)
    process.stdout.write(`  Continue it:        ${resume}\n`)
    return
  }
  if (asksAQuestion(waiting)) {
    process.stdout.write(`  Answer it:          ${resume} --answer "...your answer..."\n`)
    process.stdout.write(`  Talk it through:    pnpm factory chat ${context.issue}\n`)
    if (context.interactive) process.stdout.write(`\nOr answer here:\n`)
    return
  }
  process.stdout.write(`  Continue it:        ${resume}\n`)
  if (context.interactive) process.stdout.write(`\nContinue here:\n`)
}

async function ask(waiting: Waiting): Promise<string | boolean | null> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout })
  try {
    if (asksAQuestion(waiting)) {
      const answer = await terminal.question('Your answer (or press Enter to stop): ')
      return answer.trim() === '' ? null : answer
    }
    const answer = await terminal.question('Continue? [y/N] ')
    return answer.trim().toLowerCase() === 'y'
  } finally {
    terminal.close()
  }
}

function reportEnded(view: RunView): void {
  if (view.stoppedReason !== null) {
    process.stdout.write(`\nThe run ${view.runId} stopped before it opened a pull request.\n`)
    process.stdout.write(`${view.stoppedReason}\n`)
    process.exitCode = 3
    return
  }
  reportSuccess(view)
}

function reportSuccess(view: RunView): void {
  process.stdout.write(`\nThe run ${view.runId} is finished.\n`)
  process.stdout.write(
    view.pullRequestUrl === null
      ? 'Open the pull request on GitHub to review it.\n'
      : `The pull request is ready for you to review:\n\n  ${view.pullRequestUrl}\n\n`,
  )
  process.stdout.write('The factory has not merged it. That is yours to do.\n')
}

function reportFailure(view: RunView): void {
  process.stdout.write(`\nThe run ${view.runId} stopped.\n`)
  process.stdout.write(
    view.failure === null ? 'The run reported no reason.\n' : `${view.failure}\n`,
  )
  process.stdout.write('Nothing was merged. Fix the cause, then start again on the same issue.\n')
  process.exitCode = 1
}

function planOf(executed: unknown): string | null {
  const step: unknown = Array.isArray(executed) ? executed[0] : executed
  if (!isRecord(step) || !('output' in step)) return null
  const output = step['output']
  if (!isRecord(output) || !('planMarkdown' in output)) return null
  const plan = output['planMarkdown']
  return typeof plan === 'string' ? plan : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function issueUrlOf(repositoryUrl: string, issue: string): string {
  if (repositoryUrl === '') return `issue #${issue} on GitHub`
  return `${repositoryUrl}/issues/${issue}`
}

function issueNumber(value: string): number {
  if (!/^\d+$/.test(value.trim())) throw new InvalidIssueNumber(value)
  return Number(value.trim())
}

function issueNumberText(value: string): string {
  return String(issueNumber(value))
}

/** @riviere-role cli-error */
class MissingAnswer extends Error {
  constructor(issue: string) {
    super(
      `The implementer is waiting for an answer on issue ${issue}. Run: pnpm factory resume ${issue} --answer "your answer"`,
    )
    this.name = 'MissingAnswer'
  }
}

/** @riviere-role cli-error */
class InvalidIssueNumber extends Error {
  constructor(value: string) {
    super(`An issue number is a positive integer: ${value}`)
    this.name = 'InvalidIssueNumber'
  }
}

function loadLocalEnvironment(workingDirectory: string): void {
  try {
    process.loadEnvFile(`${workingDirectory}/.env`)
  } catch (error) {
    if (!(error instanceof Error)) throw error
  }
}

function commanderExitCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'exitCode' in error) {
    const exitCode = error['exitCode']
    return typeof exitCode === 'number' ? exitCode : undefined
  }
  return undefined
}

if (
  process.argv[1]?.endsWith('main.js') === true ||
  process.argv[1]?.endsWith('main.ts') === true
) {
  void main(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode
  })
}
