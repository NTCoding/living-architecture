import { execFile } from 'node:child_process'
import { appendFileSync, mkdirSync } from 'node:fs'
import { promisify } from 'node:util'
import type { Workflow } from '@mastra/core/workflows'
import type { Mastra } from '@mastra/core'
import { BuildWorkflow } from '@dev-factory-v1/use-cases/commands/build-workflow'
import { ListFactoryAgents } from '@dev-factory-v1/use-cases/commands/list-factory-agents'
import { CloseReviewCycle } from '@dev-factory-v1/use-cases/commands/close-review-cycle'
import { CheckWorkCommitted } from '@dev-factory-v1/use-cases/commands/check-work-committed'
import { checkWorkCommittedWithGit } from '@dev-factory-v1/use-cases/adapters/git/check-work-committed'
import { CommentOnIssue } from '@dev-factory-v1/use-cases/commands/comment-on-issue'
import { CommentOnPullRequest } from '@dev-factory-v1/use-cases/commands/comment-on-pull-request'
import { InstallDependencies } from '@dev-factory-v1/use-cases/commands/install-dependencies'
import { OpenPullRequest } from '@dev-factory-v1/use-cases/commands/open-pull-request'
import { PrepareBranch } from '@dev-factory-v1/use-cases/commands/prepare-branch'
import { ReplyToReviewComment } from '@dev-factory-v1/use-cases/commands/reply-to-review-comment'
import { PublishReviewFindings } from '@dev-factory-v1/use-cases/commands/publish-review-findings'
import { PushBranch } from '@dev-factory-v1/use-cases/commands/push-branch'
import { ReadPullRequestDiff } from '@dev-factory-v1/use-cases/commands/read-pull-request-diff'
import { installDependenciesWithPnpm } from '@dev-factory-v1/use-cases/adapters/git/install-dependencies'
import { prepareWorktreeWithGit } from '@dev-factory-v1/use-cases/adapters/git/prepare-worktree'
import { pushBranchWithGit } from '@dev-factory-v1/use-cases/adapters/git/push-branch'
import { commentOnIssueWithGithub } from '@dev-factory-v1/use-cases/adapters/github/comment-on-issue'
import { commentOnPullRequestWithGithub } from '@dev-factory-v1/use-cases/adapters/github/comment-on-pull-request'
import { openPullRequestWithGithub } from '@dev-factory-v1/use-cases/adapters/github/open-pull-request'
import { replyToReviewCommentWithGithub } from '@dev-factory-v1/use-cases/adapters/github/reply-to-review-comment'
import { publishReviewFindingWithGithub } from '@dev-factory-v1/use-cases/adapters/github/publish-review-finding'
import { readIssueWithGithub } from '@dev-factory-v1/use-cases/adapters/github/read-issue'
import { readPullRequestDiffWithGithub } from '@dev-factory-v1/use-cases/adapters/github/read-pull-request-diff'
import { waitForIssueReplyWithGithub } from '@dev-factory-v1/use-cases/adapters/github/wait-for-issue-reply'
import { waitForReviewerWithGithub } from '@dev-factory-v1/use-cases/adapters/github/wait-for-reviewer'
import { adaptWorkflowToMastra } from '@dev-factory-v1/use-cases/adapters/mastra/adapt-workflow'
import { workflowRunsWithMastra } from '@dev-factory-v1/use-cases/adapters/mastra/workflow-runs'
import type {
  CommandOutput,
  CommandRequest,
} from '@dev-factory-v1/use-cases/external-clients/process/run-command'
import { agentFrom, createAgents } from '../infra/external-clients/mastra/create-agent'
import { createAgentGeneration } from '../infra/external-clients/mastra/generate-with-agent'
import {
  createMastraInstance,
  createMastraStorage,
} from '../infra/external-clients/mastra/create-mastra'
import { createAskUserTool } from '../infra/external-clients/mastra/ask-user-tool'

const execFileAsync = promisify(execFile)

const RUN_STATUSES = [
  'running',
  'success',
  'failed',
  'tripwire',
  'suspended',
  'waiting',
  'pending',
  'canceled',
  'bailed',
  'paused',
  'skipped',
] as const

type RunStatus = (typeof RUN_STATUSES)[number]

type Factory = {
  readonly mastra: Mastra
  readonly startImplementation: Workflow
  readonly reviewCycle: Workflow
  readonly workingDirectory: string
  readonly repositoryUrl: string
  readonly workflowRuns: ReturnType<typeof workflowRunsWithMastra>
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

function tailOf(output: string): string {
  return output.trimEnd().split('\n').slice(-40).join('\n')
}

function filterOf(status: string | undefined): { readonly status?: RunStatus } {
  const known = RUN_STATUSES.find((candidate) => candidate === status)
  return known === undefined ? {} : { status: known }
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
    workflowRuns: workflowRunsWithMastra({
      listRuns: async (status) => {
        const runs = await build.startImplementation.listWorkflowRuns(filterOf(status))
        return runs.runs.map((run) => ({
          runId: run.runId,
          snapshot: run.snapshot,
          createdAt: run.createdAt,
        }))
      },
      readState: async (runId) => await build.startImplementation.getWorkflowRunById(runId),
      startRun: async (runId, input) => {
        const run = await build.startImplementation.createRun({ runId, resourceId: 'factory' })
        return await run.start({ inputData: input })
      },
      resumeRun: async (runId, options) => {
        const run = await build.startImplementation.createRun({ runId, resourceId: 'factory' })
        return await run.resume(options)
      },
    }),
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
