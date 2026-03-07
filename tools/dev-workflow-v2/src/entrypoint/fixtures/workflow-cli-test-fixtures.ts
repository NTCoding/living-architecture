import {
  unlinkSync, existsSync, mkdtempSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { WorkflowEngineDeps } from '@ntcoding/agentic-workflow-builder/engine'
import { createStore } from '@ntcoding/agentic-workflow-builder/event-store'
import { createWorkflowRunner } from '@ntcoding/agentic-workflow-builder/cli'
import type { RunnerResult } from '@ntcoding/agentic-workflow-builder/cli'
import type { WorkflowDeps } from '../../workflow-definition/domain/workflow'
import { WORKFLOW_DEFINITION } from '../../workflow-definition/infra/workflow-definition'
import {
  ROUTES, HOOKS, preToolUseHandler 
} from '../workflow-cli'

const runner = createWorkflowRunner({
  workflowDefinition: WORKFLOW_DEFINITION,
  routes: ROUTES,
  hooks: HOOKS,
  preToolUseHandler,
})

export type TestContext = {
  readonly engineDeps: WorkflowEngineDeps
  readonly workflowDeps: WorkflowDeps
  readonly dbPath: string
  readonly sessionId: string
}

export function buildTestContext(
  overrides: Partial<{ readonly sessionId: string }> = {},
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
  }

  const workflowDeps: WorkflowDeps = {
    getGitInfo: () => ({
      currentBranch: 'feat/test',
      workingTreeClean: true,
      headCommit: 'abc123',
      changedFilesVsDefault: ['src/test.ts'],
      hasCommitsVsDefault: true,
    }),
    checkPrChecks: () => true,
    getPrFeedback: () => ({
      unresolvedCount: 0,
      threads: [],
    }),
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
  const stateSteps: Readonly<Record<string, readonly (readonly string[])[]>> = {
    REVIEWING: [
      ['record-issue', '1'],
      ['transition', 'REVIEWING'],
    ],
    SUBMITTING_PR: [
      ['record-issue', '1'],
      ['transition', 'REVIEWING'],
      ['record-architecture-review-passed'],
      ['record-code-review-passed'],
      ['record-bug-scanner-passed'],
      ['transition', 'SUBMITTING_PR'],
    ],
    AWAITING_CI: [
      ['record-issue', '1'],
      ['transition', 'REVIEWING'],
      ['record-architecture-review-passed'],
      ['record-code-review-passed'],
      ['record-bug-scanner-passed'],
      ['transition', 'SUBMITTING_PR'],
      ['record-pr', '1'],
      ['transition', 'AWAITING_CI'],
    ],
    CHECKING_FEEDBACK: [
      ['record-issue', '1'],
      ['transition', 'REVIEWING'],
      ['record-architecture-review-passed'],
      ['record-code-review-passed'],
      ['record-bug-scanner-passed'],
      ['transition', 'SUBMITTING_PR'],
      ['record-pr', '1'],
      ['transition', 'AWAITING_CI'],
      ['record-ci-passed'],
      ['transition', 'CHECKING_FEEDBACK'],
    ],
    ADDRESSING_FEEDBACK: [
      ['record-issue', '1'],
      ['transition', 'REVIEWING'],
      ['record-architecture-review-passed'],
      ['record-code-review-passed'],
      ['record-bug-scanner-passed'],
      ['transition', 'SUBMITTING_PR'],
      ['record-pr', '1'],
      ['transition', 'AWAITING_CI'],
      ['record-ci-passed'],
      ['transition', 'CHECKING_FEEDBACK'],
      ['record-feedback-exists', '2'],
      ['transition', 'ADDRESSING_FEEDBACK'],
    ],
    REFLECTING: [
      ['record-issue', '1'],
      ['transition', 'REVIEWING'],
      ['record-architecture-review-passed'],
      ['record-code-review-passed'],
      ['record-bug-scanner-passed'],
      ['transition', 'SUBMITTING_PR'],
      ['record-pr', '1'],
      ['transition', 'AWAITING_CI'],
      ['record-ci-passed'],
      ['transition', 'CHECKING_FEEDBACK'],
      ['record-feedback-clean'],
      ['transition', 'REFLECTING'],
    ],
  }

  runCommand(ctx, ['init'])
  const steps = stateSteps[targetState]
  if (!steps) return
  for (const step of steps) {
    runCommand(ctx, step)
  }
}
