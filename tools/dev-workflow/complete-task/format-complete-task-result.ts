import { z } from 'zod'
import type { WorkflowResult } from '../workflow-runner/workflow-runner'

export const nextActionSchema = z.enum(['fix_errors', 'fix_review', 'resolve_feedback', 'done'])
export type NextAction = z.infer<typeof nextActionSchema>

export const failedReviewerSchema = z.object({
  name: z.string(),
  summary: z.string(),
  reportPath: z.string(),
})
export type FailedReviewer = z.infer<typeof failedReviewerSchema>

const failedReviewerArraySchema = z.array(failedReviewerSchema)

export const completeTaskResultSchema = z.object({
  success: z.boolean(),
  nextAction: nextActionSchema,
  nextInstructions: z.string(),
  output: z.unknown().optional(),
  prUrl: z.string().optional(),
  failedReviewers: z.array(failedReviewerSchema).optional(),
})
export type CompleteTaskResult = z.infer<typeof completeTaskResultSchema>

function isFailedReviewerArray(value: unknown): value is FailedReviewer[] {
  return failedReviewerArraySchema.safeParse(value).success
}

const errorDetailsSchema = z.object({
  type: z.enum(['fix_errors', 'fix_review', 'resolve_feedback', 'done']),
  details: z.unknown(),
})

type ErrorDetails = z.infer<typeof errorDetailsSchema>

function isErrorDetails(value: unknown): value is ErrorDetails {
  return errorDetailsSchema.safeParse(value).success
}

function formatFailureInstructions(error: unknown): {
  nextAction: NextAction
  instructions: string
  failedReviewers?: FailedReviewer[]
} {
  if (!isErrorDetails(error)) {
    return {
      nextAction: 'fix_errors',
      instructions: String(error),
    }
  }

  const {
    type, details 
  } = error

  if (type === 'fix_errors') {
    return {
      nextAction: 'fix_errors',
      instructions: [
        'Build, lint, or test errors found.',
        '',
        'ERRORS:',
        String(details),
        '',
        'ACTION: Fix the errors above, then re-run /complete-task.',
      ].join('\n'),
    }
  }

  if (type === 'fix_review') {
    if (isFailedReviewerArray(details)) {
      const reports = details.map((f) => `- ${f.reportPath}: ${f.summary}`).join('\n')
      return {
        nextAction: 'fix_review',
        instructions: [
          'Code review found issues that must be addressed.',
          '',
          'REVIEW REPORTS:',
          reports,
          '',
          'ACTION: Read the review reports above, fix the issues, then re-run /complete-task.',
          '',
          'DECISION FRAMEWORK:',
          '- Fix automatically if: clear/unambiguous, low risk, mechanical (typos, formatting, simple refactors)',
          '- Report to user if: ambiguous (multiple valid approaches), high risk, requires judgment, conflicts with requirements',
          '- Default: fix automatically unless a "report" condition applies',
        ].join('\n'),
        failedReviewers: details,
      }
    }
    return {
      nextAction: 'fix_review',
      instructions: [
        'Code review found issues:',
        String(details),
        '',
        'ACTION: Fix the issues and re-run /complete-task.',
      ].join('\n'),
    }
  }

  if (type === 'resolve_feedback') {
    return {
      nextAction: 'resolve_feedback',
      instructions: [
        'PR has unresolved review feedback from humans.',
        '',
        'ACTION: Address each feedback item, then re-run /complete-task.',
      ].join('\n'),
    }
  }

  return {
    nextAction: 'fix_errors',
    instructions: String(details),
  }
}

export function formatCompleteTaskResult(
  result: WorkflowResult,
  prUrl?: string,
): CompleteTaskResult {
  if (!result.success) {
    const formatted = formatFailureInstructions(result.error)
    return {
      success: false,
      nextAction: formatted.nextAction,
      nextInstructions: formatted.instructions,
      failedReviewers: formatted.failedReviewers,
    }
  }

  if (result.output !== undefined) {
    return {
      success: true,
      nextAction: 'done',
      nextInstructions: 'Workflow completed successfully.',
      output: result.output,
    }
  }

  return {
    success: true,
    nextAction: 'done',
    nextInstructions: [
      'All checks passed. PR is ready for human review.',
      '',
      `PR URL: ${prUrl}`,
      '',
      'ACTION: Inform the user that the PR is ready for review.',
    ].join('\n'),
    prUrl,
  }
}
