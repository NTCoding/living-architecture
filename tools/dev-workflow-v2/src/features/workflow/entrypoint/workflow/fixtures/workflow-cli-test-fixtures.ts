import {
  unlinkSync, existsSync, mkdtempSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type {
  WorkflowEngineDeps,
  ReviewPayload,
  ReviewType,
} from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { createStore } from '@nt-ai-lab/deterministic-agent-workflow-event-store'
import { createWorkflowRunner } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { RunnerResult } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { Workflow } from '../../../domain/workflow'
import { WORKFLOW_DEFINITION } from '../../../infra/persistence/workflow-definition'
import {
  ROUTES, PRE_TOOL_USE_POLICY 
} from '../entrypoint'
import { STATE_STEPS } from './workflow-cli-state-steps-test-fixtures'

type WorkflowDeps = Parameters<typeof Workflow.rehydrate>[1]

const runner = createWorkflowRunner({
  workflowDefinition: WORKFLOW_DEFINITION,
  routes: ROUTES,
  bashForbidden: PRE_TOOL_USE_POLICY.bashForbidden,
  isWriteAllowed: PRE_TOOL_USE_POLICY.isWriteAllowed,
})

export type TestContext = {
  readonly engineDeps: WorkflowEngineDeps
  readonly workflowDeps: WorkflowDeps
  readonly dbPath: string
  readonly sessionId: string
}

export function buildTestContext(
  overrides: Partial<{
    readonly sessionId: string
    readonly getPrFeedback: WorkflowDeps['getPrFeedback']
  }> = {},
): TestContext {
  const tempDir = mkdtempSync(join(tmpdir(), 'wf-cli-'))
  const dbPath = join(tempDir, 'test.db')
  const store = createStore(dbPath)
  const sessionId = overrides.sessionId ?? 'test-sess'

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
    listSessionReviews: () => store.listSessionReviews(sessionId),
    sleepMs: () => undefined,
    now: () => '2024-01-01T00:00:00Z',
  }

  return {
    engineDeps,
    workflowDeps,
    dbPath,
    sessionId,
  }
}

export function runCommand(ctx: TestContext, args: readonly string[]): RunnerResult {
  return runner(args, ctx.engineDeps, ctx.workflowDeps, { getSessionId: () => ctx.sessionId })
}

export function runReviewCommandWithInput(
  ctx: TestContext,
  reviewType: ReviewType,
  stdin: string,
): RunnerResult {
  return runner(['record-review', '--type', reviewType], ctx.engineDeps, ctx.workflowDeps, {
    getSessionId: () => ctx.sessionId,
    readStdin: () => stdin,
  })
}

export function runReviewCommand(
  ctx: TestContext,
  reviewType: ReviewType,
  payload: ReviewPayload,
): RunnerResult {
  return runReviewCommandWithInput(ctx, reviewType, JSON.stringify(payload))
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
      if (step[1] !== '--type' || step[2] === undefined) {
        throw new WorkflowStateError(
          "Expected record-review test step shape ['record-review', '--type', <reviewType>].",
        )
      }
      const reviewType = step[2]
      const verdict = step[3] === 'FAIL' ? 'FAIL' : 'PASS'
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
