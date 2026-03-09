import type {
  BaseEvent, WorkflowEngineDeps 
} from '@ntcoding/agentic-workflow-builder/engine'
import { createWorkflowRunner } from '@ntcoding/agentic-workflow-builder/cli'
import type { RunnerResult } from '@ntcoding/agentic-workflow-builder/cli'
import type { WorkflowDeps } from '../../workflow-definition/domain/workflow'
import { WORKFLOW_DEFINITION } from '../../workflow-definition/infra/workflow-definition'
import {
  ROUTES, HOOKS, preToolUseHandler 
} from '../workflow-cli'
import { STATE_STEPS } from './state-steps'

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
  const dbPath = ':memory:'
  const sessions = new Map<string, readonly BaseEvent[]>()
  const store = {
    readEvents(sessionId: string): readonly BaseEvent[] {
      return sessions.get(sessionId) ?? []
    },
    appendEvents(sessionId: string, events: readonly BaseEvent[]): void {
      const existing = sessions.get(sessionId) ?? []
      sessions.set(sessionId, [...existing, ...events])
    },
    sessionExists(sessionId: string): boolean {
      return sessions.has(sessionId)
    },
  }

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
  if (dbPath === '') {
    return
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
