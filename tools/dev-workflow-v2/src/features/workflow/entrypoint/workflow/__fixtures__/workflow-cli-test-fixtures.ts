import { unlinkSync, existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type {
  WorkflowEngineDeps,
  ReviewPayload,
  ReviewType,
} from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { createStore } from '@nt-ai-lab/deterministic-agent-workflow-event-store'
import type { RunnerResult } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { configureWorkflow } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { STATE_STEPS } from './workflow-cli-state-steps-test-fixtures'
import { runner } from './workflow-cli-test-runner'

type WorkflowDefinition = ReturnType<typeof configureWorkflow>
type WorkflowDeps = Parameters<WorkflowDefinition['buildWorkflow']>[1]

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
        reviewDecision: null,
        coderabbitReviewSeen: false,
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

export function runReviewCommandWithJson(
  ctx: TestContext,
  reviewType: ReviewType,
  reviewJson: string,
): RunnerResult {
  return runner(['record-review', reviewType, reviewJson], ctx.engineDeps, ctx.workflowDeps, {
    getSessionId: () => ctx.sessionId,
  })
}

export function runReviewCommand(
  ctx: TestContext,
  reviewType: ReviewType,
  payload: ReviewPayload,
): RunnerResult {
  return runReviewCommandWithJson(ctx, reviewType, JSON.stringify(payload))
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
  runCommand(ctx, ['init'])
  const steps = STATE_STEPS[targetState]
  if (!steps) return
  for (const step of steps) {
    if (step[0] === 'record-review') {
      if (step[1] === undefined) {
        throw new WorkflowStateError(
          "Expected record-review test step shape ['record-review', <reviewType>].",
        )
      }
      const reviewType = step[1],
        verdict = step[2]
      if (verdict !== 'PASS' && verdict !== 'FAIL') {
        throw new WorkflowStateError(
          "Expected record-review test step shape ['record-review', <reviewType>, <PASS|FAIL>].",
        )
      }
      runReviewCommand(ctx, reviewType, {
        verdict,
        summary: verdict === 'PASS' ? `${reviewType} passed` : `${reviewType} failed`,
        findings: [],
      })
      continue
    }
    runCommand(ctx, step)
  }
}
