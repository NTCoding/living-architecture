#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { appendFileSync, mkdirSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { promisify } from 'node:util'
import { Command } from 'commander'
import type { Run, Workflow } from '@mastra/core/workflows'
import type { Mastra } from '@mastra/core'
import { BuildWorkflow } from '@living-architecture/dev-workflow-v3-use-cases/commands/build-workflow'
import { ParseReviewers } from '@living-architecture/dev-workflow-v3-use-cases/commands/parse-reviewers'
import { ListFactoryAgents } from '@living-architecture/dev-workflow-v3-use-cases/commands/list-factory-agents'
import { CloseReviewCycle } from '@living-architecture/dev-workflow-v3-use-cases/commands/close-review-cycle'
import { CheckWorkCommitted } from '@living-architecture/dev-workflow-v3-use-cases/commands/check-work-committed'
import { checkWorkCommittedWithGit } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/check-work-committed'
import { CommentOnIssue } from '@living-architecture/dev-workflow-v3-use-cases/commands/comment-on-issue'
import { CommentOnPullRequest } from '@living-architecture/dev-workflow-v3-use-cases/commands/comment-on-pull-request'
import { InstallDependencies } from '@living-architecture/dev-workflow-v3-use-cases/commands/install-dependencies'
import { OpenPullRequest } from '@living-architecture/dev-workflow-v3-use-cases/commands/open-pull-request'
import { PrepareBranch } from '@living-architecture/dev-workflow-v3-use-cases/commands/prepare-branch'
import { ReplyToReviewComment } from '@living-architecture/dev-workflow-v3-use-cases/commands/reply-to-review-comment'
import { PublishReviewFindings } from '@living-architecture/dev-workflow-v3-use-cases/commands/publish-review-findings'
import { PushBranch } from '@living-architecture/dev-workflow-v3-use-cases/commands/push-branch'
import { ReadPullRequestDiff } from '@living-architecture/dev-workflow-v3-use-cases/commands/read-pull-request-diff'
import { installDependenciesWithPnpm } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/install-dependencies'
import { prepareWorktreeWithGit } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/prepare-worktree'
import { pushBranchWithGit } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/push-branch'
import { commentOnIssueWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/comment-on-issue'
import { commentOnPullRequestWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/comment-on-pull-request'
import { openPullRequestWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/open-pull-request'
import { replyToReviewCommentWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/reply-to-review-comment'
import { publishReviewFindingWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/publish-review-finding'
import { readIssueWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/read-issue'
import { readPullRequestDiffWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/read-pull-request-diff'
import { waitForIssueReplyWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/wait-for-issue-reply'
import { waitForReviewerWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/wait-for-reviewer'
import { adaptWorkflowToMastra } from '@living-architecture/dev-workflow-v3-use-cases/adapters/mastra/adapt-workflow'
import type {
  CommandOutput,
  CommandRequest,
} from '@living-architecture/dev-workflow-v3-use-cases/external-clients/process/run-command'
import { agentFrom, createAgents } from '../infra/external-clients/mastra/create-agent'
import { createAgentGeneration } from '../infra/external-clients/mastra/generate-with-agent'
import {
  createMastraInstance,
  createMastraStorage,
} from '../infra/external-clients/mastra/create-mastra'
import { createAskUserTool } from '../infra/external-clients/mastra/ask-user-tool'
import { readRepositoryGuidance } from '../infra/external-clients/repository/read-guidance'

const execFileAsync = promisify(execFile)

type Factory = {
  readonly mastra: Mastra
  readonly startImplementation: Workflow
  readonly reviewCycle: Workflow
  readonly workingDirectory: string
  readonly repositoryUrl: string
}

type RunOutcome = {
  readonly status: string
  readonly steps?: unknown
  readonly result?: unknown
  readonly error?: unknown
}

async function runProcess(request: CommandRequest): Promise<CommandOutput> {
  try {
    const { stdout, stderr } = await execFileAsync(request.command, [...request.arguments], {
      cwd: request.workingDirectory,
      maxBuffer: 10 * 1024 * 1024,
    })
    return { stdout, stderr, exitCode: 0 }
  } catch (error) {
    if (!isProcessFailure(error)) return didNotStart()
    const stderr = error.stderr ?? 'The command did not start.'
    const exitCode = typeof error.code === 'number' ? error.code : 1
    const stdout = error.stdout ?? noOutput()
    const logPath = saveCommandLog(request, stdout, stderr)
    return {
      stdout: tailOf(stdout),
      stderr: `${tailOf(stderr)}\nFull log: ${logPath}`,
      exitCode,
    }
  }
}

function saveRunLog(
  workingDirectory: string,
  outcome: {
    readonly workflowId: string
    readonly runId: string
    readonly status: string
    readonly message: string
  },
): void {
  const directory = `${workingDirectory}/.factory/logs`
  mkdirSync(directory, { recursive: true })
  appendFileSync(
    `${directory}/runs.log`,
    `${new Date().toISOString()} ${outcome.workflowId} ${outcome.runId} ${outcome.status} ${outcome.message.replaceAll('\n', '\\n')}\n`,
  )
}

function saveCommandLog(request: CommandRequest, stdout: string, stderr: string): string {
  const directory = `${request.workingDirectory}/.factory/logs`
  mkdirSync(directory, { recursive: true })
  const name = `${String(Date.now())}-${request.command}.log`
  const path = `${directory}/${name}`
  appendFileSync(
    path,
    [`$ ${request.command} ${request.arguments.join(' ')}`, '', stdout, '', stderr].join('\n'),
  )
  return path
}

function tailOf(output: string): string {
  return output.trimEnd().split('\n').slice(-40).join('\n')
}

/**
 * @riviere-role main
 */
export async function main(argv: readonly string[]): Promise<number> {
  const workingDirectory = process.cwd()
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

/**
 * @riviere-role main
 */
export async function buildFactory(workingDirectory: string): Promise<Factory> {
  const { storage, memory } = createMastraStorage(`file:${workingDirectory}/.factory/mastra.db`)
  const logFilePath = `${workingDirectory}/.factory/mastra-logs.jsonl`
  const agents = createAgents({
    memory,
    tools: { 'ask-user': createAskUserTool() },
    agentNames: new ListFactoryAgents().execute({ names: undefined }).agents,
  })
  const generation = createAgentGeneration({
    workingDirectory,
    agentFor: (request) => agentFrom(agents, request.id),
  })
  const runCommand = runProcess
  const worktreesDirectory = `${workingDirectory}/.factory/worktrees`
  const build = await new BuildWorkflow().execute({
    loadIssue: readIssueWithGithub({ runCommand, workingDirectory }),
    prepareBranch: (request) =>
      new PrepareBranch(
        prepareWorktreeWithGit({
          runCommand,
          repositoryPath: workingDirectory,
          worktreesDirectory,
        }),
      ).execute(request),
    installDependencies: async (request) => {
      await new InstallDependencies(installDependenciesWithPnpm({ runCommand })).execute(request)
    },
    readGuidance: () => readRepositoryGuidance(workingDirectory),
    generate: generation,
    checkWorkCommitted: (request) =>
      new CheckWorkCommitted(
        checkWorkCommittedWithGit({ runCommand, repositoryPath: workingDirectory }),
      ).execute(request),
    pushBranch: async (request) => {
      await new PushBranch(pushBranchWithGit({ runCommand })).execute(request)
    },
    openPullRequest: (request) =>
      new OpenPullRequest(openPullRequestWithGithub({ runCommand })).execute(request),
    commentOnIssue: (request) =>
      new CommentOnIssue(commentOnIssueWithGithub({ runCommand, workingDirectory })).execute(
        request,
      ),
    waitForIssueReply: waitForIssueReplyWithGithub({
      runCommand,
      workingDirectory,
      wait: () => new Promise((resolve) => setTimeout(resolve, 30_000)),
      attempts: 120,
    }),
    commentOnPullRequest: async (request) => {
      await new CommentOnPullRequest(
        commentOnPullRequestWithGithub({ runCommand, workingDirectory }),
      ).execute(request)
    },
    readPullRequestDiff: (request) =>
      new ReadPullRequestDiff(
        readPullRequestDiffWithGithub({ runCommand, workingDirectory }),
      ).execute(request),
    closeReviewCycle: (request) => Promise.resolve(new CloseReviewCycle().execute(request)),
    publishReviewFindings: (request) =>
      new PublishReviewFindings(
        publishReviewFindingWithGithub({ runCommand, workingDirectory }),
      ).execute(request),
    replyToReviewComment: async (request) => {
      await new ReplyToReviewComment(
        replyToReviewCommentWithGithub({ runCommand, workingDirectory }),
      ).execute(request)
    },
    recordRunOutcome: async (outcome) => {
      saveRunLog(workingDirectory, outcome)
    },
    waitForReviewer: waitForReviewerWithGithub({
      runCommand,
      workingDirectory,
      wait: () => new Promise((resolve) => setTimeout(resolve, 15_000)),
      attempts: 40,
    }),
    adaptWorkflow: adaptWorkflowToMastra(),
  })
  const mastra = createMastraInstance({
    storage,
    logFilePath,
    agents,
    workflows: {
      'start-implementation': build.startImplementation,
      'review-cycle': build.reviewCycle,
    },
    scorers: {
      ...(await build.startImplementation.listScorers()),
      ...(await build.reviewCycle.listScorers()),
    },
  })
  const repositoryUrl = await readRepositoryUrl(runCommand, workingDirectory)
  return {
    mastra,
    startImplementation: build.startImplementation,
    reviewCycle: build.reviewCycle,
    workingDirectory,
    repositoryUrl,
  }
}

async function readRepositoryUrl(
  runCommand: (request: CommandRequest) => Promise<CommandOutput>,
  workingDirectory: string,
): Promise<string> {
  const output = await runCommand({
    command: 'git',
    arguments: ['remote', 'get-url', 'origin'],
    workingDirectory,
  })
  if (output.exitCode !== 0) return ''
  const remote = output.stdout.trim()
  const https = remote.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '')
  return https.startsWith('http') ? https : ''
}

function createCommandLine(factory: Factory): Command {
  const program = new Command().name('factory')

  program
    .command('start-implementation')
    .description('start a run and follow it until it finishes or needs you')
    .argument('<issue>')
    .requiredOption('--model <model>', 'the model every agent in this run uses')
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
          thinking: string
          reviewers?: string
          input: boolean
        },
      ) => {
        const reviewers = new ParseReviewers().execute({
          names: options.reviewers?.split(','),
        }).reviewers
        const runId = await nextRunId(
          factory.startImplementation,
          `issue-${issueNumberText(issue)}`,
        )
        const run = await factory.startImplementation.createRun({ runId, resourceId: 'factory' })
        await follow(
          factory.startImplementation,
          factory.reviewCycle,
          run,
          () =>
            run.start({
              inputData: {
                issueNumber: issueNumber(issue),
                attempt: attemptOf(runId, `issue-${issueNumberText(issue)}`),
                model: options.model,
                thinking: options.thinking,
                reviewers,
                worktreesDirectory: `${factory.workingDirectory}/.factory/worktrees`,
              },
            }),
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
    .action(
      async (
        issue: string,
        options: { answer?: string; approveRejections?: string; input: boolean },
      ) => {
        const runId = await newestRunId(
          factory.startImplementation,
          `issue-${issueNumberText(issue)}`,
        )
        const state = await factory.startImplementation.getWorkflowRunById(runId)
        const step = suspendedStepName(state?.steps)
        if (step === 'implement' && options.answer === undefined) throw new MissingAnswer(issue)
        const question = step === 'implement' ? questionOf(state?.steps?.['implement']) : null
        const run = await factory.startImplementation.createRun({ runId, resourceId: 'factory' })
        await follow(
          factory.startImplementation,
          factory.reviewCycle,
          run,
          () => resumeStep(run, step, options, question),
          {
            issue: issueNumberText(issue),
            issueUrl: issueUrlOf(factory.repositoryUrl, issue),
            interactive: options.input,
          },
        )
      },
    )

  program
    .command('read-implementers-plan')
    .description('print the plan the implementer wrote for a run')
    .argument('<issue>')
    .action(async (issue: string) => {
      const runId = await newestRunId(
        factory.startImplementation,
        `issue-${issueNumberText(issue)}`,
      )
      const state = await factory.startImplementation.getWorkflowRunById(runId)
      const plan = planOf(state?.steps?.['draft-plan'])
      process.stdout.write(
        plan === null ? `No plan has been written for issue ${issue} yet.\n` : `${plan}\n`,
      )
    })

  program
    .command('status')
    .description('list the runs that are waiting for a person')
    .action(async () => {
      const runs = await factory.startImplementation.listWorkflowRuns({ status: 'suspended' })
      for (const run of runs.runs) {
        process.stdout.write(`${run.runId} has waited since ${String(run.createdAt)}\n`)
      }
      if (runs.runs.length === 0) process.stdout.write('Nothing is waiting for you.\n')
    })

  program
    .command('runs')
    .description('list every run')
    .action(async () => {
      const runs = await factory.startImplementation.listWorkflowRuns()
      for (const run of runs.runs) {
        process.stdout.write(`${run.runId} ${snapshotStatus(run.snapshot)}\n`)
      }
      if (runs.runs.length === 0) process.stdout.write('No runs yet.\n')
    })

  program
    .command('chat')
    .description('answer the implementer when it is waiting for a person')
    .argument('<issue>')
    .option('--no-input', 'never wait for an answer in this terminal')
    .action(async (issue: string, options: { input: boolean }) => {
      const runId = await newestRunId(
        factory.startImplementation,
        `issue-${issueNumberText(issue)}`,
      )
      const run = await factory.startImplementation.createRun({ runId, resourceId: 'factory' })
      const state = await factory.startImplementation.getWorkflowRunById(runId)
      const question = questionOf(state?.steps?.['implement'])
      if (question === null) {
        process.stdout.write(`The implementer is not waiting for an answer on issue ${issue}.\n`)
        return
      }
      process.stdout.write(`The implementer asks:\n\n  ${question}\n\nType an answer, or exit.\n`)
      const terminal = createInterface({ input: process.stdin, output: process.stdout })
      for (;;) {
        const answer = await terminal.question('> ')
        if (answer.trim() === 'exit') break
        await follow(
          factory.startImplementation,
          factory.reviewCycle,
          run,
          () => run.resume({ step: 'implement', resumeData: { answer, question } }),
          {
            issue: issueNumberText(issue),
            issueUrl: issueUrlOf(factory.repositoryUrl, issue),
            interactive: options.input,
          },
        )
        break
      }
      terminal.close()
    })

  return program
}

type RunContext = {
  readonly issue: string
  readonly issueUrl: string
  readonly interactive: boolean
}

async function follow(
  workflow: Workflow,
  nested: Workflow,
  run: Run,
  begin: () => Promise<unknown>,
  context: RunContext,
): Promise<void> {
  const stop = watch(workflow, nested, run.runId)
  const outcome: { current: unknown } = { current: await begin() }
  for (;;) {
    if (!isOutcome(outcome.current)) {
      process.stderr.write(`The run ${run.runId} returned something unexpected.\n`)
      process.exitCode = 1
      return
    }
    if (outcome.current.status === 'success') {
      await stop()
      reportEnded(outcome.current, run.runId)
      return
    }
    if (outcome.current.status !== 'suspended') {
      await stop()
      reportFailure(outcome.current, run.runId)
      return
    }
    const waiting = awaitingPerson(outcome.current)
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
    outcome.current = await resumeRun(run, waiting, answer)
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

type Waiting = {
  readonly step: string
  readonly question: string | null
  readonly rejections: readonly { readonly commentId: number; readonly reason: string }[]
  readonly unaddressed: readonly number[]
  readonly reason: string
}

function showWaiting(waiting: Waiting | null): void {
  if (waiting === null) return
  if (waiting.question !== null) {
    process.stdout.write(`\nThe implementer asks:\n\n  ${waiting.question}\n`)
    return
  }
  if (waiting.rejections.length > 0) {
    process.stdout.write('\nThe implementer wants to reject these findings:\n\n')
    for (const rejection of waiting.rejections) {
      process.stdout.write(`  comment ${String(rejection.commentId)}: ${rejection.reason}\n`)
    }
    return
  }
  if (waiting.unaddressed.length > 0) {
    process.stdout.write(
      `\nThe implementer did not answer findings: ${waiting.unaddressed.join(', ')}\n`,
    )
    return
  }
  if (waiting.reason !== '') process.stdout.write(`\n${waiting.reason}\n`)
}

function reportWaiting(waiting: Waiting | null, context: RunContext): void {
  const resume = `pnpm factory resume ${context.issue}`
  process.stdout.write(`\nThe run is waiting for you.\n\n`)
  if (waiting === null) {
    process.stdout.write(`  What is waiting:    pnpm factory status\n`)
    process.stdout.write(`  Continue it:        ${resume}\n`)
    return
  }
  if (waiting.rejections.length > 0) {
    process.stdout.write(`  Approve:            ${resume} --approve-rejections true\n`)
    process.stdout.write(`  Do not approve:     ${resume} --approve-rejections false\n`)
    return
  }
  if (waiting.question !== null) {
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
    if (waiting.question !== null) {
      const answer = await terminal.question('Your answer (or press Enter to stop): ')
      return answer.trim() === '' ? null : answer
    }
    const prompt =
      waiting.rejections.length > 0 ? 'Approve these rejections? [y/N] ' : 'Continue? [y/N] '
    const answer = await terminal.question(prompt)
    return answer.trim().toLowerCase() === 'y'
  } finally {
    terminal.close()
  }
}

async function resumeRun(run: Run, waiting: Waiting, answer: string | boolean): Promise<unknown> {
  if (waiting.step === 'implement') {
    return await run.resume({
      step: 'implement',
      resumeData: {
        answer: typeof answer === 'string' ? answer : '',
        ...(waiting.question === null ? {} : { question: waiting.question }),
      },
    })
  }
  if (waiting.step === 'address-feedback') {
    return await run.resume({
      step: 'address-feedback',
      resumeData: { approved: answer === true },
    })
  }
  return await run.resume({ step: waiting.step })
}

function awaitingPerson(outcome: RunOutcome): Waiting | null {
  return suspendedPayloadOf(outcome)
}

function suspendedPayloadOf(outcome: RunOutcome): Waiting | null {
  const step = suspendedStep(outcome)
  if (step === null) return null
  return {
    step: step.name,
    question: suspendPayloadOf(step.payload),
    rejections: rejectionsOf(step.payload),
    unaddressed: unaddressedOf(step.payload),
    reason: reasonOfPayload(step.payload),
  }
}

function rejectionsOf(
  payload: unknown,
): readonly { readonly commentId: number; readonly reason: string }[] {
  if (!isRecord(payload) || !Array.isArray(payload['rejections'])) return []
  return payload['rejections'].flatMap((entry) => {
    if (!isRecord(entry)) return []
    const commentId = entry['commentId']
    const reason = entry['reason']
    if (typeof commentId !== 'number' || typeof reason !== 'string') return []
    return [{ commentId, reason }]
  })
}

function unaddressedOf(payload: unknown): readonly number[] {
  if (!isRecord(payload) || !Array.isArray(payload['unaddressed'])) return []
  return payload['unaddressed'].filter((id): id is number => typeof id === 'number')
}

function reasonOfPayload(payload: unknown): string {
  if (!isRecord(payload)) return ''
  const reason = payload['reason']
  return typeof reason === 'string' ? reason : ''
}

function suspendedStep(outcome: RunOutcome): {
  readonly name: string
  readonly payload: unknown
  readonly output: unknown
} | null {
  const steps = outcome.steps
  if (!isRecord(steps)) return null
  for (const [name, value] of Object.entries(steps)) {
    const step: unknown = Array.isArray(value) ? value[0] : value
    if (!isRecord(step) || step['status'] !== 'suspended') continue
    return { name, payload: step['suspendPayload'], output: step['output'] }
  }
  return null
}

function suspendPayloadOf(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  const question = payload['question']
  return typeof question === 'string' ? question : null
}

function reportEnded(outcome: RunOutcome, runId: string): void {
  const stopped = stoppedReasonOf(outcome)
  if (stopped !== null) {
    process.stdout.write(`\nThe run ${runId} stopped before it opened a pull request.\n`)
    process.stdout.write(`${stopped}\n`)
    process.exitCode = 3
    return
  }
  reportSuccess(outcome, runId)
}

function stoppedReasonOf(outcome: RunOutcome): string | null {
  if (!isRecord(outcome.result)) return null
  const reason = outcome.result['stoppedReason']
  return typeof reason === 'string' && reason !== '' ? reason : null
}

function reportSuccess(outcome: RunOutcome, runId: string): void {
  const url = pullRequestUrlOf(outcome)
  process.stdout.write(`\nThe run ${runId} is finished.\n`)
  process.stdout.write(
    url === null
      ? 'Open the pull request on GitHub to review it.\n'
      : `The pull request is ready for you to review:\n\n  ${url}\n\n`,
  )
  process.stdout.write('The factory has not merged it. That is yours to do.\n')
}

function reportFailure(outcome: RunOutcome, runId: string): void {
  const reason = failureOf(outcome)
  process.stdout.write(`\nThe run ${runId} stopped.\n`)
  process.stdout.write(reason === null ? 'The run reported no reason.\n' : `${reason}\n`)
  process.stdout.write('Nothing was merged. Fix the cause, then start again on the same issue.\n')
  process.exitCode = 1
}

function failureOf(outcome: RunOutcome): string | null {
  if (!isRecord(outcome.error)) return null
  const message = outcome.error['message']
  return typeof message === 'string' ? message : null
}

function pullRequestUrlOf(outcome: RunOutcome): string | null {
  if (!isRecord(outcome.result)) return null
  const url = outcome.result['pullRequestUrl']
  return typeof url === 'string' ? url : null
}

function planOf(executed: unknown): string | null {
  const step: unknown = Array.isArray(executed) ? executed[0] : executed
  if (!isRecord(step) || !('output' in step)) return null
  const output = step['output']
  if (!isRecord(output) || !('planMarkdown' in output)) return null
  const plan = output['planMarkdown']
  return typeof plan === 'string' ? plan : null
}

function questionOf(executed: unknown): string | null {
  const step: unknown = Array.isArray(executed) ? executed[0] : executed
  if (!isRecord(step) || !('suspendPayload' in step)) return null
  return suspendPayloadOf(step['suspendPayload'])
}

function isOutcome(value: unknown): value is RunOutcome {
  return isRecord(value) && typeof value['status'] === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function attemptOf(runId: string, base: string): number {
  if (runId === base) return 1
  const suffix = Number(runId.slice(base.length + 1))
  return Number.isInteger(suffix) && suffix > 0 ? suffix : 1
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

function suspendedStepName(steps: unknown): string | null {
  if (!isRecord(steps)) return null
  for (const [name, value] of Object.entries(steps)) {
    const step: unknown = Array.isArray(value) ? value[0] : value
    if (isRecord(step) && step['status'] === 'suspended') return name
  }
  return null
}

function resumeStep(
  run: Run,
  step: string | null,
  options: { answer?: string },
  question: string | null,
): Promise<unknown> {
  if (step === 'implement' && options.answer !== undefined) {
    return run.resume({
      step: 'implement',
      resumeData: {
        answer: options.answer,
        ...(question === null ? {} : { question }),
      },
    })
  }
  if (step === 'address-feedback') {
    return run.resume({ step: 'address-feedback' })
  }
  return run.resume({})
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

async function existingRunIds(workflow: Workflow): Promise<readonly string[]> {
  const runs = await workflow.listWorkflowRuns({})
  return runs.runs.map((run) => run.runId)
}

async function nextRunId(workflow: Workflow, base: string): Promise<string> {
  const ids = await existingRunIds(workflow)
  if (!ids.includes(base)) return base
  const suffixes = ids
    .filter((id) => id.startsWith(`${base}-`))
    .map((id) => Number(id.slice(base.length + 1)))
    .filter((value) => Number.isInteger(value))
  const highest = suffixes.length === 0 ? 1 : Math.max(...suffixes)
  return `${base}-${highest + 1}`
}

async function newestRunId(workflow: Workflow, base: string): Promise<string> {
  const ids = await existingRunIds(workflow)
  const numbered = ids
    .map((id) => ({ id, number: runNumber(id, base) }))
    .filter((entry): entry is { id: string; number: number } => entry.number !== undefined)
  const newest = numbered.reduce<{ id: string; number: number } | undefined>(
    (chosen, entry) => (chosen === undefined || entry.number > chosen.number ? entry : chosen),
    undefined,
  )
  return newest === undefined ? base : newest.id
}

function runNumber(id: string, base: string): number | undefined {
  if (id === base) return 1
  if (!id.startsWith(`${base}-`)) return undefined
  const number = Number(id.slice(base.length + 1))
  return Number.isInteger(number) ? number : undefined
}

function loadLocalEnvironment(workingDirectory: string): void {
  try {
    process.loadEnvFile(`${workingDirectory}/.env`)
  } catch (error) {
    if (!(error instanceof Error)) throw error
  }
}

function noOutput(): string {
  return ''
}

function didNotStart(): CommandOutput {
  return { stdout: noOutput(), stderr: 'The command did not start.', exitCode: 1 }
}

function isProcessFailure(error: unknown): error is {
  readonly stdout?: string
  readonly stderr?: string
  readonly code?: number
} {
  return typeof error === 'object' && error !== null && 'code' in error
}

function commanderExitCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'exitCode' in error) {
    const exitCode = error['exitCode']
    return typeof exitCode === 'number' ? exitCode : undefined
  }
  return undefined
}

function snapshotStatus(snapshot: unknown): string {
  if (!isRecord(snapshot) || !('status' in snapshot)) return 'unknown'
  const status = snapshot['status']
  return typeof status === 'string' ? status : 'unknown'
}

if (
  process.argv[1]?.endsWith('main.js') === true ||
  process.argv[1]?.endsWith('main.ts') === true
) {
  void main(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode
  })
}
