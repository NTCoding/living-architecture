#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { mkdirSync, readdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { promisify } from 'node:util'
import { Command } from 'commander'
import { Mastra } from '@mastra/core'
import { LibSQLStore } from '@mastra/libsql'
import { Memory } from '@mastra/memory'
import { IssueNumber, ModelIdentifier } from '@living-architecture/dev-workflow-v3-domain-model'
import { InstallDependencies } from '@living-architecture/dev-workflow-v3-use-cases/commands/install-dependencies'
import { PrepareBranch } from '@living-architecture/dev-workflow-v3-use-cases/commands/prepare-branch'
import { VerifyWork } from '@living-architecture/dev-workflow-v3-use-cases/commands/verify-work'
import { CommitWork } from '@living-architecture/dev-workflow-v3-use-cases/commands/commit-work'
import { PushBranch } from '@living-architecture/dev-workflow-v3-use-cases/commands/push-branch'
import { OpenPullRequest } from '@living-architecture/dev-workflow-v3-use-cases/commands/open-pull-request'
import { prepareWorktreeWithGit } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/prepare-worktree'
import { commitWorkWithGit } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/commit-work'
import { pushBranchWithGit } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/push-branch'
import { readIssueWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/read-issue'
import { installDependenciesWithPnpm } from '@living-architecture/dev-workflow-v3-use-cases/adapters/git/install-dependencies'
import { openPullRequestWithGithub } from '@living-architecture/dev-workflow-v3-use-cases/adapters/github/open-pull-request'
import { runProjectChecksWithCommands } from '@living-architecture/dev-workflow-v3-use-cases/adapters/checks/run-project-checks'
import type {
  CommandOutput,
  CommandRequest,
} from '@living-architecture/dev-workflow-v3-use-cases/external-clients/process/run-command'
import { createStartImplementationWorkflow } from '../mastra/workflows/start-implementation'
import { createPlannerAgent } from '../mastra/agents/planner'
import { createImplementerAgent } from '../mastra/agents/implementer'
import { createImplementationWorkspace } from '../mastra/workspace'
import { readRepositoryGuidance } from '../infra/external-clients/repository/read-guidance'

const execFileAsync = promisify(execFile)

/**
 * Starts the process that the external clients ask for, and reports the exit
 * code rather than throwing, so a failing check is data the workflow can act on.
 */
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
 * Wires the application and starts it. This is the only place where the real
 * git, GitHub and process clients are constructed.
 * @riviere-role main
 */
export async function main(argv: readonly string[]): Promise<number> {
  const workingDirectory = process.cwd()
  loadLocalEnvironment(workingDirectory)
  mkdirSync(`${workingDirectory}/.factory`, { recursive: true })
  const storage = new LibSQLStore({ id: 'factory', url: 'file:.factory/mastra.db' })
  const memory = new Memory({ storage })
  const workflow = createStartImplementationWorkflow({
    readIssue: readIssueWithGithub({ runCommand: runProcess, workingDirectory }),
    readGuidance: () => readRepositoryGuidance(workingDirectory),
    plannerFor: (model) => createPlannerAgent(ModelIdentifier.parse(model)),
    implementerFor: (model, worktreePath) =>
      createImplementerAgent({
        model: ModelIdentifier.parse(model),
        workspace: createImplementationWorkspace(worktreePath),
        memory,
      }),
    prepareBranch: new PrepareBranch(
      prepareWorktreeWithGit({
        runCommand: runProcess,
        repositoryPath: workingDirectory,
        worktreesDirectory: `${workingDirectory}/.factory/worktrees`,
      }),
    ),
    installDependencies: new InstallDependencies(
      installDependenciesWithPnpm({ runCommand: runProcess }),
    ),
    verifyWork: new VerifyWork(runProjectChecksWithCommands({ runCommand: runProcess })),
    commitWork: new CommitWork(commitWorkWithGit({ runCommand: runProcess })),
    pushBranch: new PushBranch(pushBranchWithGit({ runCommand: runProcess })),
    openPullRequest: new OpenPullRequest(openPullRequestWithGithub({ runCommand: runProcess })),
  })
  const mastra = new Mastra({
    workflows: { 'start-implementation': workflow },
    storage,
  })

  const program = new Command().name('factory')

  program
    .command('start-implementation')
    .argument('<issue>')
    .requiredOption('--model <model>', 'the model every agent in this run uses')
    .action(async (issue: string, options: { model: string }) => {
      const model = ModelIdentifier.parse(options.model)
      const issueNumber = IssueNumber.parseFromText(issue)
      const run = await workflow.createRun({ runId: issueNumber.runId(), resourceId: 'factory' })
      const result = await run.start({
        inputData: {
          issueNumber: issueNumber.value(),
          model: model.value(),
          worktreesDirectory: `${workingDirectory}/.factory/worktrees`,
        },
      })
      report(result.status, run.runId, 'The run is waiting for a person. Use resume.', 3)
    })

  program
    .command('resume')
    .argument('<issue>')
    .requiredOption('--model <model>', 'the model every agent in this run uses')
    .option('--approved <approved>', 'whether the plan is approved', 'true')
    .action(async (issue: string, options: { model: string; approved: string }) => {
      ModelIdentifier.parse(options.model)
      const issueNumber = IssueNumber.parseFromText(issue)
      const run = await workflow.createRun({ runId: issueNumber.runId(), resourceId: 'factory' })
      const result = await run.resume({
        step: 'request-plan-approval',
        resumeData: { approved: options.approved !== 'false', notes: null },
      })
      report(result.status, run.runId, 'The run is waiting for a person.', 3)
    })

  program.command('status').action(async () => {
    const runs = await workflow.listWorkflowRuns({ status: 'suspended' })
    for (const run of runs.runs) {
      process.stdout.write(`${run.runId} has waited since ${String(run.createdAt)}\n`)
    }
    if (runs.runs.length === 0) process.stdout.write('No run is waiting.\n')
  })

  program.command('runs').action(async () => {
    const runs = await workflow.listWorkflowRuns()
    for (const run of runs.runs) {
      process.stdout.write(`${run.runId} ${snapshotStatus(run.snapshot)}\n`)
    }
    if (runs.runs.length === 0) process.stdout.write('No runs yet.\n')
  })

  program
    .command('chat')
    .argument('<issue>')
    .requiredOption('--model <model>', 'the model every agent in this run uses')
    .action(async (issue: string, options: { model: string }) => {
      const model = ModelIdentifier.parse(options.model)
      const issueNumber = IssueNumber.parseFromText(issue)
      const thread = `issue-${issueNumber.value()}`
      const implementer = createImplementerAgent({
        model,
        workspace: createImplementationWorkspace(worktreeFor(issueNumber.value())),
        memory,
      })
      const suspended = await implementer.listSuspendedRuns({
        threadId: thread,
        resourceId: 'factory',
      })
      if (suspended.runs.length === 0) {
        process.stdout.write(`No conversation is open for issue ${issue}.\n`)
        return
      }
      const lines = createInterface({ input: process.stdin, output: process.stdout })
      for await (const line of lines) {
        if (line.trim() === 'exit') break
        const response = await implementer.generate(line, {
          memory: { thread, resource: 'factory' },
          autoResumeSuspendedTools: true,
        })
        process.stdout.write(`${response.text}\n`)
      }
    })

  void mastra
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

function worktreeFor(issueNumber: number): string {
  const worktreesDirectory = `${process.cwd()}/.factory/worktrees`
  const names = readdirSync(worktreesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
  const name = names.find((entry) => entry.startsWith(`issue-${issueNumber}-`))
  return name === undefined ? worktreesDirectory : `${worktreesDirectory}/${name}`
}

function loadLocalEnvironment(workingDirectory: string): void {
  try {
    process.loadEnvFile(`${workingDirectory}/.env`)
  } catch {
    // No .env file. The key comes from the shell instead.
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
    const exitCode = error.exitCode
    return typeof exitCode === 'number' ? exitCode : undefined
  }
  return undefined
}

function snapshotStatus(snapshot: unknown): string {
  if (typeof snapshot === 'object' && snapshot !== null && 'status' in snapshot) {
    return String(snapshot.status)
  }
  return 'unknown'
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
