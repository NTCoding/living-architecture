import {
  describe, it, expect, afterEach 
} from 'vitest'
import type { TestContext } from './fixtures/workflow-cli-test-fixtures'
import {
  buildTestContext,
  cleanupDb,
  progressToState,
  runCommand,
} from './fixtures/workflow-cli-test-fixtures'

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
    readonly getPrFeedback?: TestContext['workflowDeps']['getPrFeedback']
  }): TestContext {
    const ctx = buildTestContext(
      overrides?.getPrFeedback === undefined ? {} : { getPrFeedback: overrides.getPrFeedback },
    )
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
    it('transitions from REFLECTING to COMPLETE', () => {
      const ctx = setup({
        getPrFeedback: () => ({
          reviewDecision: 'APPROVED',
          coderabbitReviewSeen: true,
          unresolvedCount: 0,
          threads: [],
        }),
      })
      progressToState(ctx, 'REFLECTING')
      const result = runCommand(ctx, ['transition', 'COMPLETE'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('rework: REVIEWING back to IMPLEMENTING', () => {
    it('transitions to IMPLEMENTING when a review fails and resets flags', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')
      runCommand(ctx, ['record-code-review-failed'])
      const result = runCommand(ctx, ['transition', 'IMPLEMENTING'])
      expect(result.exitCode).toStrictEqual(0)
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
  })

  describe('addressing feedback cycle', () => {
    it('transitions from ADDRESSING_FEEDBACK to REVIEWING after addressing all threads', () => {
      const ctx = setup({
        getPrFeedback: () => ({
          reviewDecision: 'CHANGES_REQUESTED',
          coderabbitReviewSeen: true,
          unresolvedCount: 2,
          threads: [],
        }),
      })
      progressToState(ctx, 'ADDRESSING_FEEDBACK')
      Object.defineProperty(ctx.workflowDeps, 'getPrFeedback', {
        value: () => ({
          reviewDecision: 'APPROVED',
          coderabbitReviewSeen: true,
          unresolvedCount: 0,
          threads: [],
        }),
      })
      runCommand(ctx, ['verify-feedback-addressed'])
      const result = runCommand(ctx, ['transition', 'REVIEWING'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('block to wrong state', () => {
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
    it('rejects IMPLEMENTING to REVIEWING without commits', () => {
      const ctx = setup({ gitInfo: { hasCommitsVsDefault: false } })
      runCommand(ctx, ['init'])
      runCommand(ctx, ['record-issue', '1'])
      const result = runCommand(ctx, ['transition', 'REVIEWING'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('No commits')
    })

    it('rejects IMPLEMENTING to REVIEWING with unclean working tree', () => {
      const ctx = setup({ gitInfo: { workingTreeClean: false } })
      runCommand(ctx, ['init'])
      runCommand(ctx, ['record-issue', '1'])
      const result = runCommand(ctx, ['transition', 'REVIEWING'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('not clean')
    })

    it('rejects IMPLEMENTING to REVIEWING without issue recorded', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['transition', 'REVIEWING'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('No issue recorded')
    })

    it('rejects REVIEWING to SUBMITTING_PR without all reviews passed', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')
      const result = runCommand(ctx, ['transition', 'SUBMITTING_PR'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('Not all reviews passed')
    })

    it('rejects REVIEWING to IMPLEMENTING when all reviews passed', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')
      runCommand(ctx, ['record-architecture-review-passed'])
      runCommand(ctx, ['record-code-review-passed'])
      runCommand(ctx, ['record-bug-scanner-passed'])
      const result = runCommand(ctx, ['transition', 'IMPLEMENTING'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('All reviews passed')
    })

    it('rejects SUBMITTING_PR to AWAITING_CI without PR recorded', () => {
      const ctx = setup()
      progressToState(ctx, 'SUBMITTING_PR')
      const result = runCommand(ctx, ['transition', 'AWAITING_CI'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('prNumber not set')
    })

    it('rejects AWAITING_CI to AWAITING_PR_FEEDBACK without CI passed', () => {
      const ctx = setup()
      progressToState(ctx, 'AWAITING_CI')
      const result = runCommand(ctx, ['transition', 'AWAITING_PR_FEEDBACK'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('CI not passed')
    })

    it('rejects AWAITING_CI to IMPLEMENTING when CI passed', () => {
      const ctx = setup()
      progressToState(ctx, 'AWAITING_CI')
      runCommand(ctx, ['record-ci-passed'])
      const result = runCommand(ctx, ['transition', 'IMPLEMENTING'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('CI passed')
    })

    it('allows REFLECTING to COMPLETE without a workflow-level reflection guard', () => {
      const ctx = setup({
        getPrFeedback: () => ({
          reviewDecision: 'APPROVED',
          coderabbitReviewSeen: true,
          unresolvedCount: 0,
          threads: [],
        }),
      })
      progressToState(ctx, 'REFLECTING')
      const result = runCommand(ctx, ['transition', 'COMPLETE'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('rejects ADDRESSING_FEEDBACK to REVIEWING without feedback addressed', () => {
      const ctx = setup({
        getPrFeedback: () => ({
          reviewDecision: 'CHANGES_REQUESTED',
          coderabbitReviewSeen: true,
          unresolvedCount: 1,
          threads: [],
        }),
      })
      progressToState(ctx, 'ADDRESSING_FEEDBACK')
      const result = runCommand(ctx, ['transition', 'REVIEWING'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('Feedback not addressed')
    })

    it('blocks feedback verification while GitHub still reports unresolved feedback', () => {
      const ctx = setup({
        getPrFeedback: () => ({
          reviewDecision: 'CHANGES_REQUESTED',
          coderabbitReviewSeen: true,
          unresolvedCount: 1,
          threads: [],
        }),
      })
      progressToState(ctx, 'ADDRESSING_FEEDBACK')
      const verifyResult = runCommand(ctx, ['verify-feedback-addressed'])
      expect(verifyResult.exitCode).toStrictEqual(2)
      expect(verifyResult.output).toContain('CHANGES_REQUESTED')
      const result = runCommand(ctx, ['transition', 'REVIEWING'])
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('Feedback not addressed')
    })
  })
})
