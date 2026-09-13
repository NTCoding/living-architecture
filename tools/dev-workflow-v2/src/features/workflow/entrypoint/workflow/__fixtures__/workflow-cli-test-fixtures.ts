import { unlinkSync, existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { type WorkflowEngineDeps } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { createStore } from '@nt-ai-lab/deterministic-agent-workflow-event-store'
import type { RunnerResult } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { configureWorkflow } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { STATE_STEPS } from './workflow-cli-state-steps-test-fixtures'
import { runner } from './workflow-cli-test-runner'

type WorkflowDefinition = ReturnType<typeof configureWorkflow>
type WorkflowDeps = Parameters<WorkflowDefinition['buildWorkflow']>[1]

class WorkflowProgressionTestError extends Error {}

export type TestContext = {
  readonly engineDeps: WorkflowEngineDeps
  readonly workflowDeps: WorkflowDeps
  readonly dbPath: string
  readonly sessionId: string
  readonly transcriptPath: string
}

export function buildTestContext(
  overrides: Partial<{
    readonly sessionId: string
    readonly transcriptPath: string
    readonly getPrFeedback: WorkflowDeps['getPrFeedback']
    readonly createPullRequest: WorkflowDeps['createPullRequest']
  }> = {},
): TestContext {
  const tempDir = mkdtempSync(join(tmpdir(), 'wf-cli-'))
  const dbPath = join(tempDir, 'test.db')
  const store = createStore(dbPath)
  const sessionId = overrides.sessionId ?? 'test-sess',
    transcriptPath = overrides.transcriptPath ?? '/transcripts/test-session.jsonl'

  const engineDeps: WorkflowEngineDeps = {
    store,
    sessionContext: { getMainSessionId: () => sessionId },
    getPluginRoot: () => '/plugin',
    getEnvFilePath: () => '/env',
    readFile: () => '# instructions',
    appendToFile: () => undefined,
    now: () => '2024-01-01T00:00:00Z',
    transcriptReader: { readMessages: () => [] },
  }

  const workflowDeps: WorkflowDeps = {
    getGitInfo: () => ({
      currentBranch: 'feat/test',
      workingTreeClean: true,
      headCommit: 'abc123',
      changedFilesVsDefault: ['src/test.ts'],
      hasCommitsVsDefault: true,
    }),
    getPrFeedback:
      overrides.getPrFeedback ??
      (() => ({
        reviewerStatuses: {
          'architecture-review': 'APPROVED',
          'code-review': 'APPROVED',
          'bug-scanner': 'APPROVED',
          'task-check': 'APPROVED',
          coderabbit: 'APPROVED',
        },
        reviewDecision: null,
        coderabbitReviewSeen: true,
        unresolvedCount: 0,
        threads: [],
      })),
    createPullRequest:
      overrides.createPullRequest ??
      (() => ({
        prNumber: 123,
        prUrl: 'https://github.com/example/repo/pull/123',
        isDraft: false,
      })),
    listSessionReviews: () => store.listSessionReviews(sessionId),
    sleepMs: () => undefined,
    now: () => '2024-01-01T00:00:00Z',
  }

  return {
    engineDeps,
    workflowDeps,
    dbPath,
    sessionId,
    transcriptPath,
  }
}

export function runCommand(ctx: TestContext, args: readonly string[]): RunnerResult {
  return runner(args, ctx.engineDeps, ctx.workflowDeps, {
    getSessionId: () => ctx.sessionId,
    getSessionTranscriptPath: () => ctx.transcriptPath,
    getSessionRepository: () => '/repository',
  })
}

export function runHook(ctx: TestContext, stdinJson: string): RunnerResult {
  return runner([], ctx.engineDeps, ctx.workflowDeps, { readStdin: () => stdinJson })
}

export function cleanupDb(dbPath: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const path = `${dbPath}${suffix}`
    if (existsSync(path)) unlinkSync(path)
  }
}

export function progressToState(ctx: TestContext, targetState: string): void {
  const initResult = runCommand(ctx, ['init'])
  if (initResult.exitCode !== 0)
    throw new WorkflowProgressionTestError(`Failed to initialise workflow: ${initResult.output}`)
  const steps = STATE_STEPS[targetState]
  if (!steps) return
  for (const step of steps) {
    const result = runCommand(ctx, step)
    if (result.exitCode !== 0)
      throw new WorkflowProgressionTestError(
        `Failed to progress workflow with ${step.join(' ')}: ${result.output}`,
      )
  }
}
