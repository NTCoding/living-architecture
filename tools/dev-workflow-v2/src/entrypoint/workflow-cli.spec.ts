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

describe('workflow-cli commands', () => {
  const dbPaths: string[] = []

  afterEach(() => {
    for (const path of dbPaths) {
      cleanupDb(path)
    }
    dbPaths.length = 0
  })

  function setup(): TestContext {
    const ctx = buildTestContext()
    dbPaths.push(ctx.dbPath)
    return ctx
  }

  it('returns error for unknown command', () => {
    const ctx = setup()
    const result = runCommand(ctx, ['bogus'])
    expect(result.exitCode).toStrictEqual(1)
    expect(result.output).toContain('Unknown command: bogus')
  })

  describe('init', () => {
    it('starts a session', () => {
      const ctx = setup()
      const result = runCommand(ctx, ['init'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('transition', () => {
    it('returns error when state argument is missing', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['transition'])
      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('missing required argument')
    })

    it('returns error for invalid state name', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['transition', 'INVALID_STATE'])
      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('invalid state')
    })
  })

  describe('record-issue', () => {
    it('records an issue number', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-issue', '42'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when number is missing', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-issue'])
      expect(result.exitCode).toStrictEqual(1)
    })

    it('returns error for non-numeric argument', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-issue', 'abc'])
      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('not a valid number')
    })
  })

  describe('record-branch', () => {
    it('records a branch name', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-branch', 'feat/test'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when branch is missing', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-branch'])
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('record-architecture-review-passed', () => {
    it('records in REVIEWING state', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')
      const result = runCommand(ctx, ['record-architecture-review-passed'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-architecture-review-failed', () => {
    it('records in REVIEWING state', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')
      const result = runCommand(ctx, ['record-architecture-review-failed'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-code-review-passed', () => {
    it('records in REVIEWING state', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')
      const result = runCommand(ctx, ['record-code-review-passed'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-code-review-failed', () => {
    it('records in REVIEWING state', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')
      const result = runCommand(ctx, ['record-code-review-failed'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-bug-scanner-passed', () => {
    it('records in REVIEWING state', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')
      const result = runCommand(ctx, ['record-bug-scanner-passed'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-bug-scanner-failed', () => {
    it('records in REVIEWING state', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')
      const result = runCommand(ctx, ['record-bug-scanner-failed'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-task-check-passed', () => {
    it('records in REVIEWING state', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')
      const result = runCommand(ctx, ['record-task-check-passed'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-pr', () => {
    it('records PR number and optional URL', () => {
      const ctx = setup()
      progressToState(ctx, 'SUBMITTING_PR')
      const result = runCommand(ctx, ['record-pr', '123', 'https://github.com/pr/123'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when PR number is missing', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-pr'])
      expect(result.exitCode).toStrictEqual(1)
    })

    it('returns error for non-numeric PR number', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-pr', 'abc'])
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('record-ci-passed', () => {
    it('records CI passed in AWAITING_CI state', () => {
      const ctx = setup()
      progressToState(ctx, 'AWAITING_CI')
      const result = runCommand(ctx, ['record-ci-passed'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-ci-failed', () => {
    it('records with output', () => {
      const ctx = setup()
      progressToState(ctx, 'AWAITING_CI')
      const result = runCommand(ctx, ['record-ci-failed', 'build failed'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when output is missing', () => {
      const ctx = setup()
      progressToState(ctx, 'AWAITING_CI')
      const result = runCommand(ctx, ['record-ci-failed'])
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('record-feedback-clean', () => {
    it('records in CHECKING_FEEDBACK state', () => {
      const ctx = setup()
      progressToState(ctx, 'CHECKING_FEEDBACK')
      const result = runCommand(ctx, ['record-feedback-clean'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-feedback-exists', () => {
    it('records feedback count', () => {
      const ctx = setup()
      progressToState(ctx, 'CHECKING_FEEDBACK')
      const result = runCommand(ctx, ['record-feedback-exists', '3'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when count is missing', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-feedback-exists'])
      expect(result.exitCode).toStrictEqual(1)
    })

    it('returns error for non-numeric count', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-feedback-exists', 'abc'])
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('record-feedback-addressed', () => {
    it('records with count in ADDRESSING_FEEDBACK state', () => {
      const ctx = setup()
      progressToState(ctx, 'ADDRESSING_FEEDBACK')
      const result = runCommand(ctx, ['record-feedback-addressed', '2'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when count is missing', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-feedback-addressed'])
      expect(result.exitCode).toStrictEqual(1)
    })

    it('returns error for non-numeric count', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-feedback-addressed', 'abc'])
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('record-reflection', () => {
    it('records reflection path', () => {
      const ctx = setup()
      progressToState(ctx, 'REFLECTING')
      const result = runCommand(ctx, ['record-reflection', '/path/reflection.md'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when path is missing', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-reflection'])
      expect(result.exitCode).toStrictEqual(1)
    })
  })
})
