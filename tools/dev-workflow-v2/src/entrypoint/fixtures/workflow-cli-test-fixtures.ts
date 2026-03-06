import {
  unlinkSync, existsSync, mkdtempSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { WorkflowEngineDeps } from '@ntcoding/agentic-workflow-builder/engine'
import { createStore } from '../../infra/persistence/sqlite-event-store'
import type { AdapterDeps } from '../../shell/composition-root'
import type { WorkflowDeps } from '../../workflow-definition/domain/workflow'
import { runWorkflow } from '../workflow-cli'

export function buildTestDeps(
  overrides: Partial<{
    readonly sessionId: string
    readonly stdinJson: string
    readonly pluginRoot: string
  }> = {},
): {
  readonly deps: AdapterDeps
  readonly dbPath: string
} {
  const tempDir = mkdtempSync(join(tmpdir(), 'wf-cli-'))
  const dbPath = join(tempDir, 'test.db')
  const store = createStore(dbPath)

  const sessionId = overrides.sessionId ?? 'test-sess'
  const stdinJson = overrides.stdinJson ?? '{}'
  const pluginRoot = overrides.pluginRoot ?? '/plugin'

  const engineDeps: WorkflowEngineDeps = {
    store,
    getPluginRoot: () => pluginRoot,
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
    now: () => '2024-01-01T00:00:00Z',
  }

  return {
    deps: {
      getSessionId: () => sessionId,
      readStdin: () => stdinJson,
      engineDeps,
      workflowDeps,
    },
    dbPath,
  }
}

export function cleanupDb(dbPath: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const path = `${dbPath}${suffix}`
    if (existsSync(path)) unlinkSync(path)
  }
}

export function progressToState(deps: AdapterDeps, targetState: string): void {
  const stateSteps: Readonly<Record<string, readonly (readonly string[])[]>> = {
    VERIFYING: [['transition', 'VERIFYING']],
    REVIEWING: [['transition', 'VERIFYING'], ['record-verify-passed'], ['transition', 'REVIEWING']],
    SUBMITTING_PR: [
      ['transition', 'VERIFYING'],
      ['record-verify-passed'],
      ['transition', 'REVIEWING'],
      ['record-review-passed'],
      ['transition', 'SUBMITTING_PR'],
    ],
    AWAITING_CI: [
      ['transition', 'VERIFYING'],
      ['record-verify-passed'],
      ['transition', 'REVIEWING'],
      ['record-review-passed'],
      ['transition', 'SUBMITTING_PR'],
      ['record-pr', '1'],
      ['transition', 'AWAITING_CI'],
    ],
    CHECKING_FEEDBACK: [
      ['transition', 'VERIFYING'],
      ['record-verify-passed'],
      ['transition', 'REVIEWING'],
      ['record-review-passed'],
      ['transition', 'SUBMITTING_PR'],
      ['record-pr', '1'],
      ['transition', 'AWAITING_CI'],
      ['record-ci-passed'],
      ['transition', 'CHECKING_FEEDBACK'],
    ],
    ADDRESSING_FEEDBACK: [
      ['transition', 'VERIFYING'],
      ['record-verify-passed'],
      ['transition', 'REVIEWING'],
      ['record-review-passed'],
      ['transition', 'SUBMITTING_PR'],
      ['record-pr', '1'],
      ['transition', 'AWAITING_CI'],
      ['record-ci-passed'],
      ['transition', 'CHECKING_FEEDBACK'],
      ['record-feedback-exists', '2'],
      ['transition', 'ADDRESSING_FEEDBACK'],
    ],
    REFLECTING: [
      ['transition', 'VERIFYING'],
      ['record-verify-passed'],
      ['transition', 'REVIEWING'],
      ['record-review-passed'],
      ['transition', 'SUBMITTING_PR'],
      ['record-pr', '1'],
      ['transition', 'AWAITING_CI'],
      ['record-ci-passed'],
      ['transition', 'CHECKING_FEEDBACK'],
      ['record-feedback-clean'],
      ['transition', 'REFLECTING'],
    ],
  }

  runWorkflow(['init'], deps)
  const steps = stateSteps[targetState]
  if (!steps) return
  for (const step of steps) {
    runWorkflow(step, deps)
  }
}
