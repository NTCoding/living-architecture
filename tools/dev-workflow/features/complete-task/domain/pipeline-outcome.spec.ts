import {
  describe, it, expect, vi 
} from 'vitest'
import { formatCompleteTaskResult } from './pipeline-outcome'
import type { WorkflowResult } from '../../../platform/domain/workflow-execution/workflow-runner'
import type { CompleteTaskContext } from './task-to-complete'

vi.mock('node:fs', () => ({ writeFileSync: vi.fn() }))

describe('formatCompleteTaskResult', () => {
  const baseContext: CompleteTaskContext = {
    branch: 'test-branch',
    reviewDir: '/reviews/test',
    hasIssue: true,
    issueNumber: 123,
    commitMessage: 'feat: test commit',
    prTitle: 'Test PR',
    prBody: 'Test body',
  }

  describe('success cases', () => {
    it('formats success result with output', () => {
      const result: WorkflowResult = {
        success: true,
        output: { data: 'test output' },
      }

      const formatted = formatCompleteTaskResult(result, baseContext)

      expect(formatted.success).toStrictEqual(true)
      expect(formatted.nextAction).toStrictEqual('done')
      expect(formatted.output).toMatchObject({ data: 'test output' })
    })

    it('formats success result without output but with PR URL', () => {
      const result: WorkflowResult = { success: true }
      const contextWithPr = {
        ...baseContext,
        prUrl: 'https://github.com/org/repo/pull/456',
      }

      const formatted = formatCompleteTaskResult(result, contextWithPr)

      expect(formatted.success).toStrictEqual(true)
      expect(formatted.nextAction).toStrictEqual('done')
      expect(formatted.nextInstructions).toContain('PR URL')
      expect(formatted.prUrl).toStrictEqual('https://github.com/org/repo/pull/456')
    })

    it('formats success result without output or PR URL', () => {
      const result: WorkflowResult = { success: true }

      const formatted = formatCompleteTaskResult(result, baseContext)

      expect(formatted.success).toStrictEqual(true)
      expect(formatted.nextAction).toStrictEqual('done')
      expect(formatted.nextInstructions).toContain('ready for human review')
    })
  })

  describe('failure cases', () => {
    it('formats fix_errors failure with log file', () => {
      const result: WorkflowResult = {
        success: false,
        error: {
          type: 'fix_errors',
          details: 'lint error details',
        },
        failedStep: 'verify-build',
      }

      const formatted = formatCompleteTaskResult(result, baseContext)

      expect(formatted.success).toStrictEqual(false)
      expect(formatted.nextAction).toStrictEqual('fix_errors')
      expect(formatted.failedStep).toStrictEqual('verify-build')
      expect(formatted.logFile).toStrictEqual('/reviews/test/verify-build.log')
    })

    it('formats fix_review failure with reviewer details', () => {
      const result: WorkflowResult = {
        success: false,
        error: {
          type: 'fix_review',
          details: [
            {
              name: 'reviewer1',
              reportPath: '/path/to/report.md',
            },
          ],
        },
        failedStep: 'code-review',
      }

      const formatted = formatCompleteTaskResult(result, baseContext)

      expect(formatted.success).toStrictEqual(false)
      expect(formatted.nextAction).toStrictEqual('fix_review')
      expect(formatted.nextInstructions).toContain('/path/to/report.md')
      expect(formatted.failedReviewers).toStrictEqual([
        {
          name: 'reviewer1',
          reportPath: '/path/to/report.md',
        },
      ])
    })

    it('formats fix_review failure without reviewer details', () => {
      const result: WorkflowResult = {
        success: false,
        error: {
          type: 'fix_review',
          details: 'review comments',
        },
        failedStep: 'code-review',
      }

      const formatted = formatCompleteTaskResult(result, baseContext)

      expect(formatted.success).toStrictEqual(false)
      expect(formatted.nextAction).toStrictEqual('fix_review')
      expect(formatted.nextInstructions).toContain('review comments')
    })

    it('formats resolve_feedback failure', () => {
      const result: WorkflowResult = {
        success: false,
        error: {
          type: 'resolve_feedback',
          details: 'unresolved threads',
        },
        failedStep: 'fetch-feedback',
      }

      const formatted = formatCompleteTaskResult(result, baseContext)

      expect(formatted.success).toStrictEqual(false)
      expect(formatted.nextAction).toStrictEqual('resolve_feedback')
      expect(formatted.nextInstructions).toContain('unresolved review feedback')
    })

    it('formats unknown error type as fix_errors', () => {
      const result: WorkflowResult = {
        success: false,
        error: 'unexpected error string',
        failedStep: 'unknown',
      }

      const formatted = formatCompleteTaskResult(result, baseContext)

      expect(formatted.success).toStrictEqual(false)
      expect(formatted.nextAction).toStrictEqual('fix_errors')
      expect(formatted.logFile).toStrictEqual('/reviews/test/unknown.log')
    })

    it('formats done type error as fix_errors with log file', () => {
      const result: WorkflowResult = {
        success: false,
        error: {
          type: 'done',
          details: 'something went wrong',
        },
        failedStep: 'step',
      }

      const formatted = formatCompleteTaskResult(result, baseContext)

      expect(formatted.nextAction).toStrictEqual('fix_errors')
      expect(formatted.logFile).toStrictEqual('/reviews/test/step.log')
    })
  })
})
