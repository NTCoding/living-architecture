import { unlinkSync, existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type {
  WorkflowEngineDeps,
  ReviewPayload,
  ReviewType,
} from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { createStore } from '@nt-ai-lab/deterministic-agent-workflow-event-store'
import type { SqliteEventStore } from '@nt-ai-lab/deterministic-agent-workflow-event-store'
import type { RunnerResult } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { configureWorkflow } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { STATE_STEPS } from './workflow-cli-state-steps-test-fixtures'
import { defaultRequiredPullRequestChecks } from './workflow-required-checks-test-fixtures'
import { runner } from './workflow-cli-test-runner'
type WorkflowDefinition = ReturnType<typeof configureWorkflow>
type WorkflowDeps = Parameters<WorkflowDefinition['buildWorkflow']>[1]
export type TestContext = {
  readonly engineDeps: WorkflowEngineDeps
  readonly workflowDeps: WorkflowDeps
  readonly store: SqliteEventStore
  readonly dbPath: string
  readonly sessionId: string
  readonly transcriptPath: string
}
export function buildTestContext(
  overrides: Partial<{
    readonly sessionId: string
    readonly transcriptPath: string
    readonly runLocalVerification: WorkflowDeps['runLocalVerification']
    readonly getRequiredPullRequestChecks: WorkflowDeps['getRequiredPullRequestChecks']
    readonly getPrFeedback: WorkflowDeps['getPrFeedback']
    readonly createPullRequest: WorkflowDeps['createPullRequest']
  }> = {},
): TestContext {
  const dbPath = join(mkdtempSync(join(tmpdir(), 'wf-cli-')), 'test.db')
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
    runLocalVerification: overrides.runLocalVerification ?? (() => undefined),
    getGitInfo: () => ({
      currentBranch: 'feat/test',
      workingTreeClean: true,
      defaultBranch: 'main',
      headCommit: 'b'.repeat(40),
      changedFilesVsDefault: ['src/test.ts'],
      hasCommitsVsDefault: true,
    }),
    getRequiredPullRequestChecks:
      overrides.getRequiredPullRequestChecks ?? defaultRequiredPullRequestChecks,
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
        repository: 'example/repo',
        baseRevision: 'a'.repeat(40),
        headRevision: 'b'.repeat(40),
      })),
    listSessionReviews: () => store.listSessionReviews(sessionId),
    now: () => '2024-01-01T00:00:00Z',
  }
  return {
    engineDeps,
    workflowDeps,
    store,
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
export function runReviewCommand(
  ctx: TestContext,
  reviewType: ReviewType,
  payload: ReviewPayload,
): RunnerResult {
  return runner(
    ['record-review', reviewType, JSON.stringify(payload)],
    ctx.engineDeps,
    ctx.workflowDeps,
    {
      getSessionId: () => ctx.sessionId,
    },
  )
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

const REVIEWER_TYPES = ['architecture-review', 'code-review', 'bug-scanner', 'task-check'] as const

function boundFeedback(reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED', unresolvedCount: number) {
  return {
    repository: 'example/repo',
    headRevision: 'b'.repeat(40),
    reviewDecision,
    coderabbitReviewSeen: true,
    codeRabbitReview: {
      type: 'completed' as const,
      statusId: 1,
      evidenceUrl: 'https://github.com/example/repo/actions/runs/1',
    },
    unresolvedCount,
    threads: [],
  }
}

export function setPrFeedback(ctx: TestContext, kind: 'actionable' | 'clean'): void {
  const feedback =
    kind === 'clean' ? boundFeedback('APPROVED', 0) : boundFeedback('CHANGES_REQUESTED', 2)
  Object.defineProperty(ctx.workflowDeps, 'getPrFeedback', {
    value: () => feedback,
  })
}

export function seedReviewerSatisfaction(ctx: TestContext): void {
  const reviews = REVIEWER_TYPES.map((reviewType, index) => ({
    id: index + 1,
    sessionId: ctx.sessionId,
    createdAt: '2024-01-01T00:00:00Z',
    reviewType,
    verdict: 'PASS' as const,
    findings: [],
    pullRequestNumber: 123,
    completionProvenance: {
      bundleId: 'review-example/repo-123',
      providerSessionId: 'provider-session',
      providerRunId: `provider-run-${index}`,
      baseRevision: 'a'.repeat(40),
      headRevision: 'b'.repeat(40),
      exactFilesDigest: 'digest',
      exactFiles: ['src/test.ts'],
      reviewerDefinitionVersion: '1',
    },
  }))
  Object.defineProperty(ctx.workflowDeps, 'listSessionReviews', {
    value: () => reviews,
  })
}

export function progressToState(ctx: TestContext, targetState: string): void {
  runCommand(ctx, ['init'])
  const steps = STATE_STEPS[targetState]
  if (!steps) return
  for (const step of steps) {
    if (step[0] === 'set-pr-feedback') {
      setPrFeedback(ctx, step[1] === 'clean' ? 'clean' : 'actionable')
      continue
    }
    if (step[0] === 'seed-reviewer-satisfaction') {
      seedReviewerSatisfaction(ctx)
      continue
    }
    runCommand(ctx, step)
  }
}
