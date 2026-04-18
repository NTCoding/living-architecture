import {
  unlinkSync, existsSync, mkdtempSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { WorkflowEngineDeps } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { createStore } from '@nt-ai-lab/deterministic-agent-workflow-event-store'
import { createWorkflowRunner } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { RunnerResult } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { WorkflowDeps } from '../../domain/workflow'
import { WORKFLOW_DEFINITION } from '../../infra/persistence/workflow-definition'
import {
  ROUTES, PRE_TOOL_USE_POLICY 
} from '../workflow-cli'
import { STATE_STEPS } from './workflow-cli-state-steps-test-fixtures'

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
    runCommand(ctx, step)
  }
}
