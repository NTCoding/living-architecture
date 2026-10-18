#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { promisify } from 'node:util'
import { Command } from 'commander'
import type { Workflow } from '@mastra/core/workflows'
import { BuildWorkflow } from '@living-architecture/dev-workflow-v3-use-cases/commands/build-workflow'
import { CloseReviewCycle } from '@living-architecture/dev-workflow-v3-use-cases/commands/close-review-cycle'
import { CommentOnPullRequest } from '@living-architecture/dev-workflow-v3-use-cases/commands/comment-on-pull-request'
import { CommitWork } from '@living-architecture/dev-workflow-v3-use-cases/commands/commit-work'
import { InstallDependencies } from '@living-architecture/dev-workflow-v3-use-cases/commands/install-dependencies'
import { OpenPullRequest } from '@living-architecture/dev-workflow-v3-use-cases/commands/open-pull-request'
import { PrepareBranch } from '@living-architecture/dev-workflow-v3-use-cases/commands/prepare-branch'
import { PublishReviewFindings } from '@living-architecture/dev-workflow-v3-use-cases/commands/publish-review-findings'
import { PushBranch } from '@living-architecture/dev-workflow-v3-use-cases/commands/push-branch'
import { ReadPullRequestDiff } from '@living-architecture/dev-workflow-v3-use-cases/commands/read-pull-request-diff'
import { VerifyWork } from '@living-architecture/dev-workflow-v3-use-cases/commands/verify-work'
import { commitWorkWithGit } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/commit-work'
import { installDependenciesWithPnpm } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/install-dependencies'
import { prepareWorktreeWithGit } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/prepare-worktree'
import { pushBranchWithGit } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/push-branch'
import { runProjectChecksWithCommands } from '@living-architecture/dev-workflow-v3-use-cases/adapters/checks/run-project-checks'
import { commentOnPullRequestWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/comment-on-pull-request'
import { openPullRequestWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/open-pull-request'
import { publishReviewFindingWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/publish-review-finding'
import { readIssueWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/read-issue'
import { readPullRequestDiffWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/read-pull-request-diff'
import { waitForReviewerWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/wait-for-reviewer'
import { adaptWorkflowToMastra } from '@living-architecture/dev-workflow-v3-use-cases/adapters/mastra/adapt-workflow'
import type {
  CommandOutput,
  CommandRequest,
} from '@living-architecture/dev-workflow-v3-use-cases/external-clients/process/run-command'
import { createAgentFactory } from '../infra/external-clients/mastra/create-agent'
import { createAgentGeneration } from '../infra/external-clients/mastra/generate-with-agent'
import {
  createMastraInstance,
  createMastraStorage,
} from '../infra/external-clients/mastra/create-mastra'
import { createAskUserTool } from '../infra/external-clients/mastra/ask-user-tool'
import { readRepositoryGuidance } from '../infra/external-clients/repository/read-guidance'
import { readReviewerInstructions } from '../infra/external-clients/repository/read-reviewer-instructions'

const execFileAsync = promisify(execFile)

type Factory = {
  readonly startImplementation: Workflow
  readonly reviewCycle: Workflow
  readonly workingDirectory: string
  readonly generation: ReturnType<typeof createAgentGeneration>
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
    if (error.stdout === undefined) return { stdout: noOutput(), stderr, exitCode }
    return { stdout: error.stdout, stderr, exitCode }
  }
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
  }
}

async function buildFactory(workingDirectory: string): Promise<Factory> {
  const { storage, memory } = createMastraStorage(`file:${workingDirectory}/.factory/mastra.db`)
  const generation = createAgentGeneration({
    agentFor: createAgentFactory({ memory, tools: { askUser: createAskUserTool() } }),
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
    readReviewerInstructions: (reviewer) => readReviewerInstructions(workingDirectory, reviewer),
    generate: generation,
    verifyWork: (request) =>
      new VerifyWork(runProjectChecksWithCommands({ runCommand })).execute(request),
    commitWork: (request) => new CommitWork(commitWorkWithGit({ runCommand })).execute(request),
    pushBranch: async (request) => {
      await new PushBranch(pushBranchWithGit({ runCommand })).execute(request)
    },
    openPullRequest: (request) =>
      new OpenPullRequest(openPullRequestWithGithub({ runCommand })).execute(request),
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
    waitForReviewer: waitForReviewerWithGithub({
      runCommand,
      workingDirectory,
      wait: () => new Promise((resolve) => setTimeout(resolve, 15_000)),
      attempts: 40,
    }),
    adaptWorkflow: adaptWorkflowToMastra(),
  })
  createMastraInstance({
    storage,
    workflows: {
      'start-implementation': build.startImplementation,
      'review-cycle': build.reviewCycle,
    },
  })
  return {
    startImplementation: build.startImplementation,
    reviewCycle: build.reviewCycle,
    workingDirectory,
    generation,
  }
}

function createCommandLine(factory: Factory): Command {
  const program = new Command().name('factory')

  program
    .command('start-implementation')
    .argument('<issue>')
    .requiredOption('--model <model>', 'the model every agent in this run uses')
    .action(async (issue: string, options: { model: string }) => {
      const run = await factory.startImplementation.createRun({
        runId: await nextRunId(factory.startImplementation, `issue-${issueNumberText(issue)}`),
        resourceId: 'factory',
      })
      const result = await run.start({
        inputData: {
          issueNumber: issueNumber(issue),
          model: options.model,
          worktreesDirectory: `${factory.workingDirectory}/.factory/worktrees`,
        },
      })
      report(result.status, run.runId, 'The run is waiting for a person. Use resume.', 3)
    })

  program
    .command('resume')
    .argument('<issue>')
    .requiredOption('--model <model>', 'the model every agent in this run uses')
    .option('--approved <approved>', 'whether the plan is approved', 'true')
    .option('--answer <answer>', 'the answer to a blocker the implementer raised')
    .action(
      async (issue: string, options: { model: string; approved: string; answer?: string }) => {
        const run = await factory.startImplementation.createRun({
          runId: await newestRunId(factory.startImplementation, `issue-${issueNumberText(issue)}`),
          resourceId: 'factory',
        })
        const result =
          options.answer === undefined
            ? await run.resume({
                step: 'request-plan-approval',
                resumeData: { approved: options.approved !== 'false', notes: null },
              })
            : await run.resume({ step: 'implement', resumeData: { answer: options.answer } })
        report(result.status, run.runId, 'The run is waiting for a person.', 3)
      },
    )

  program.command('status').action(async () => {
    const runs = await factory.startImplementation.listWorkflowRuns({ status: 'suspended' })
    for (const run of runs.runs) {
      process.stdout.write(`${run.runId} has waited since ${String(run.createdAt)}\n`)
    }
    if (runs.runs.length === 0) process.stdout.write('No run is waiting.\n')
  })

  program.command('runs').action(async () => {
    const runs = await factory.startImplementation.listWorkflowRuns()
    for (const run of runs.runs) {
      process.stdout.write(`${run.runId} ${snapshotStatus(run.snapshot)}\n`)
    }
    if (runs.runs.length === 0) process.stdout.write('No runs yet.\n')
  })

  program
    .command('chat')
    .argument('<issue>')
    .requiredOption('--model <model>', 'the model every agent in this run uses')
    .action(async (issue: string) => {
      const runId = await newestRunId(
        factory.startImplementation,
        `issue-${issueNumberText(issue)}`,
      )
      const run = await factory.startImplementation.createRun({ runId, resourceId: 'factory' })
      const question = await suspendedQuestion(factory.startImplementation, runId)
      if (question === null) {
        process.stdout.write(`No conversation is open for issue ${issue}.\n`)
        return
      }
      process.stdout.write(`${issue}  ${question}\n`)
      const lines = createInterface({ input: process.stdin, output: process.stdout })
      for await (const line of lines) {
        if (line.trim() === 'exit') break
        const result = await run.resume({ step: 'implement', resumeData: { answer: line } })
        process.stdout.write(`${runId}: ${result.status}\n`)
        if (result.status !== 'suspended') break
      }
    })

  return program
}

async function suspendedQuestion(workflow: Workflow, runId: string): Promise<string | null> {
  const state = await workflow.getWorkflowRunById(runId)
  const executed = state?.steps?.['implement']
  if (executed === undefined) return null
  const step = Array.isArray(executed) ? executed[0] : executed
  return questionOf(step?.suspendPayload) ?? null
}

function questionOf(payload: unknown): string | undefined {
  if (!isRecord(payload) || !('question' in payload)) return undefined
  const question = payload['question']
  return typeof question === 'string' ? question : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function issueNumber(value: string): number {
  if (!/^\d+$/.test(value.trim())) throw new InvalidIssueNumber(value)
  return Number(value.trim())
}

function issueNumberText(value: string): string {
  return String(issueNumber(value))
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

function report(
  status: string,
  runId: string,
  suspendedMessage: string,
  suspendedCode: number,
): void {
  if (status === 'suspended') {
    process.stdout.write(`${runId}: ${suspendedMessage}\n`)
    process.exitCode = suspendedCode
    return
  }
  process.stdout.write(`${runId}: ${status}\n`)
  if (status !== 'success') process.exitCode = 1
}

if (
  process.argv[1]?.endsWith('main.js') === true ||
  process.argv[1]?.endsWith('main.ts') === true
) {
  void main(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode
  })
}
