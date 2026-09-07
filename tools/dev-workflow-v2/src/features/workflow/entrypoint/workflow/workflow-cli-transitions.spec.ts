import { describe, it, expect, afterEach } from 'vitest'
import type { TestContext } from './__fixtures__/workflow-cli-test-fixtures'
import {
  buildTestContext,
  cleanupDb,
  progressToState,
  runCommand,
  setPrFeedback,
} from './__fixtures__/workflow-cli-test-fixtures'

describe('workflow-cli transitions', () => {
  const dbPaths: string[] = []

  afterEach(() => {
    for (const path of dbPaths) {
      cleanupDb(path)
    }
    dbPaths.length = 0
  })

  function setup(overrides?: {
    readonly gitInfo?: Partial<{
      readonly hasCommitsVsDefault: boolean
      readonly workingTreeClean: boolean
    }>
  }): TestContext {
    const ctx = buildTestContext()
    if (overrides?.gitInfo) {
      const original = ctx.workflowDeps.getGitInfo
      const gitOverrides = overrides.gitInfo
      Object.defineProperty(ctx.workflowDeps, 'getGitInfo', {
        value: () => ({
          ...original(),
          ...gitOverrides,
        }),
      })
    }
    dbPaths.push(ctx.dbPath)
    return ctx
  }

  describe('full happy path to COMPLETE', () => {
    it('reaches REFLECTING through the review gate and transitions to COMPLETE', () => {
      const ctx = setup()
      progressToState(ctx, 'REFLECTING')
      const result = runCommand(ctx, ['transition', 'COMPLETE'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('the review gate owns the exit from REVIEWING', () => {
    it('auto-transitions to ADDRESSING_FEEDBACK when actionable feedback exists', () => {
      const ctx = setup()
      progressToState(ctx, 'ADDRESSING_FEEDBACK')
      expect(runCommand(ctx, ['get-state']).output).toContain('ADDRESSING_FEEDBACK')
    })

    it('auto-transitions to REFLECTING when the gate is satisfied', () => {
      const ctx = setup()
      progressToState(ctx, 'REFLECTING')
      expect(runCommand(ctx, ['get-state']).output).toContain('REFLECTING')
    })

    it('reports pending reviewers while any of the four has not recorded satisfaction', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')
      setPrFeedback(ctx, 'clean')

      const result = runCommand(ctx, ['verify-pr-review-gate'])

      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('Waiting for all four reviewers to be satisfied.')
      expect(runCommand(ctx, ['get-state']).output).toContain('REVIEWING')
    })

    it.each([
      { to: 'REFLECTING', reason: 'verify-pr-review-gate' },
      { to: 'ADDRESSING_FEEDBACK', reason: 'verify-pr-review-gate' },
      { to: 'SUBMITTING_PR', reason: 'Illegal transition REVIEWING -> SUBMITTING_PR' },
      { to: 'IMPLEMENTING', reason: 'Illegal transition REVIEWING -> IMPLEMENTING' },
    ] as const)('refuses manual transition to $to', ({ to, reason }) => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')

      const result = runCommand(ctx, ['transition', to])

      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain(reason)
    })
  })

  describe('remediation loop', () => {
    it('returns from ADDRESSING_FEEDBACK through VERIFYING for a follow-up review', () => {
      const ctx = setup()
      progressToState(ctx, 'ADDRESSING_FEEDBACK')

      const result = runCommand(ctx, ['transition', 'VERIFYING'])

      expect(result.exitCode).toStrictEqual(0)
    })

    it('no longer exposes verify-feedback-addressed as a transition shortcut', () => {
      const ctx = setup()
      progressToState(ctx, 'ADDRESSING_FEEDBACK')

      const result = runCommand(ctx, ['verify-feedback-addressed'])

      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('Unknown test workflow command.')
    })
  })

  describe('block and unblock', () => {
    it('transitions to BLOCKED and back to pre-blocked state', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      runCommand(ctx, ['record-issue', '1'])
      const blockResult = runCommand(ctx, ['transition', 'BLOCKED'])
      expect(blockResult.exitCode).toStrictEqual(0)
      const unblockResult = runCommand(ctx, ['transition', 'IMPLEMENTING'])
      expect(unblockResult.exitCode).toStrictEqual(0)
    })

    it('rejects transition from BLOCKED to a state other than pre-blocked', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      runCommand(ctx, ['record-issue', '1'])
      runCommand(ctx, ['transition', 'BLOCKED'])
      const result = runCommand(ctx, ['transition', 'REVIEWING'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('Must return to pre-blocked state')
    })
  })

  describe('guard failures', () => {
    it('rejects IMPLEMENTING to VERIFYING without commits', () => {
      const ctx = setup({ gitInfo: { hasCommitsVsDefault: false } })
      runCommand(ctx, ['init'])
      runCommand(ctx, ['record-issue', '1'])
      const result = runCommand(ctx, ['transition', 'VERIFYING'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('No commits')
    })

    it('rejects IMPLEMENTING to VERIFYING with unclean working tree', () => {
      const ctx = setup({ gitInfo: { workingTreeClean: false } })
      runCommand(ctx, ['init'])
      runCommand(ctx, ['record-issue', '1'])
      const result = runCommand(ctx, ['transition', 'VERIFYING'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('not clean')
    })

    it('rejects IMPLEMENTING to VERIFYING without issue recorded', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['transition', 'VERIFYING'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('No issue recorded')
    })
  })
})
