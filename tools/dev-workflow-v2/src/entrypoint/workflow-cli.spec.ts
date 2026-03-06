import {
  describe, it, expect, afterEach 
} from 'vitest'
import type { AdapterDeps } from '../shell/composition-root'
import { runWorkflow } from './workflow-cli'
import {
  buildTestDeps, cleanupDb, progressToState 
} from './fixtures/workflow-cli-test-fixtures'

describe('workflow-cli commands', () => {
  const dbPaths: string[] = []

  afterEach(() => {
    for (const path of dbPaths) {
      cleanupDb(path)
    }
    dbPaths.length = 0
  })

  function setup(
    overrides: Partial<{
      readonly sessionId: string
      readonly stdinJson: string
    }> = {},
  ): AdapterDeps {
    const result = buildTestDeps(overrides)
    dbPaths.push(result.dbPath)
    return result.deps
  }

  it('returns error for unknown command', () => {
    const deps = setup()
    const result = runWorkflow(['bogus'], deps)
    expect(result.exitCode).toStrictEqual(1)
    expect(result.output).toContain('Unknown command: bogus')
  })

  describe('init', () => {
    it('starts a session', () => {
      const deps = setup()
      const result = runWorkflow(['init'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('transition', () => {
    it('returns error when state argument is missing', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['transition'], deps)
      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('missing required argument')
    })

    it('returns error for invalid state name', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['transition', 'INVALID_STATE'], deps)
      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('invalid state')
    })
  })

  describe('record-issue', () => {
    it('records an issue number', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['record-issue', '42'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when number is missing', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['record-issue'], deps)
      expect(result.exitCode).toStrictEqual(1)
    })

    it('returns error for non-numeric argument', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['record-issue', 'abc'], deps)
      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('not a valid number')
    })
  })

  describe('record-branch', () => {
    it('records a branch name', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['record-branch', 'feat/test'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when branch is missing', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['record-branch'], deps)
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('record-verify-passed', () => {
    it('records in VERIFYING state', () => {
      const deps = setup()
      progressToState(deps, 'VERIFYING')
      const result = runWorkflow(['record-verify-passed'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-verify-failed', () => {
    it('records with output', () => {
      const deps = setup()
      progressToState(deps, 'VERIFYING')
      const result = runWorkflow(['record-verify-failed', 'lint errors'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when output is missing', () => {
      const deps = setup()
      progressToState(deps, 'VERIFYING')
      const result = runWorkflow(['record-verify-failed'], deps)
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('record-review-passed', () => {
    it('records in REVIEWING state', () => {
      const deps = setup()
      progressToState(deps, 'REVIEWING')
      const result = runWorkflow(['record-review-passed'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-review-failed', () => {
    it('records failed reviewers', () => {
      const deps = setup()
      progressToState(deps, 'REVIEWING')
      const result = runWorkflow(['record-review-failed', 'reviewer-a'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-pr', () => {
    it('records PR number and optional URL', () => {
      const deps = setup()
      progressToState(deps, 'SUBMITTING_PR')
      const result = runWorkflow(['record-pr', '123', 'https://github.com/pr/123'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when PR number is missing', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['record-pr'], deps)
      expect(result.exitCode).toStrictEqual(1)
    })

    it('returns error for non-numeric PR number', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['record-pr', 'abc'], deps)
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('record-ci-passed', () => {
    it('records CI passed in AWAITING_CI state', () => {
      const deps = setup()
      progressToState(deps, 'AWAITING_CI')
      const result = runWorkflow(['record-ci-passed'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-ci-failed', () => {
    it('records with output', () => {
      const deps = setup()
      progressToState(deps, 'AWAITING_CI')
      const result = runWorkflow(['record-ci-failed', 'build failed'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when output is missing', () => {
      const deps = setup()
      progressToState(deps, 'AWAITING_CI')
      const result = runWorkflow(['record-ci-failed'], deps)
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('record-feedback-clean', () => {
    it('records in CHECKING_FEEDBACK state', () => {
      const deps = setup()
      progressToState(deps, 'CHECKING_FEEDBACK')
      const result = runWorkflow(['record-feedback-clean'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-feedback-exists', () => {
    it('records feedback count', () => {
      const deps = setup()
      progressToState(deps, 'CHECKING_FEEDBACK')
      const result = runWorkflow(['record-feedback-exists', '3'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when count is missing', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['record-feedback-exists'], deps)
      expect(result.exitCode).toStrictEqual(1)
    })

    it('returns error for non-numeric count', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['record-feedback-exists', 'abc'], deps)
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('record-feedback-addressed', () => {
    it('records in ADDRESSING_FEEDBACK state', () => {
      const deps = setup()
      progressToState(deps, 'ADDRESSING_FEEDBACK')
      const result = runWorkflow(['record-feedback-addressed'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-reflection', () => {
    it('records reflection path', () => {
      const deps = setup()
      progressToState(deps, 'REFLECTING')
      const result = runWorkflow(['record-reflection', '/path/reflection.md'], deps)
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when path is missing', () => {
      const deps = setup()
      runWorkflow(['init'], deps)
      const result = runWorkflow(['record-reflection'], deps)
      expect(result.exitCode).toStrictEqual(1)
    })
  })
})
