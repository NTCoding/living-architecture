import { z } from 'zod'
import { writeFileSync } from 'node:fs'
import type { WorkflowResult } from '../workflow-runner/workflow-runner'
import type { CompleteTaskContext } from './complete-task'

const nextActionSchema = z.enum(['fix_errors', 'fix_review', 'resolve_feedback', 'done'])
type NextAction = z.infer<typeof nextActionSchema>

const failedReviewerSchema = z.object({
  name: z.string(),
  summary: z.string(),
  reportPath: z.string(),
})
type FailedReviewer = z.infer<typeof failedReviewerSchema>

const failedReviewerArraySchema = z.array(failedReviewerSchema)

const completeTaskResultSchema = z.object({
  success: z.boolean(),
  nextAction: nextActionSchema,
  nextInstructions: z.string(),
  output: z.unknown().optional(),
  prUrl: z.string().optional(),
  failedStep: z.string().optional(),
  logFile: z.string().optional(),
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
  ctx: CompleteTaskContext,
): CompleteTaskResult {
  if (!result.success) {
    const formatted = formatFailureInstructions(result.error)
    const failedStep = result.failedStep

    if (formatted.nextAction === 'fix_errors' && failedStep && ctx.reviewDir) {
      const logFile = `${ctx.reviewDir}/${failedStep}.log`
      writeFileSync(logFile, formatted.instructions, 'utf-8')

      return {
        success: false,
        nextAction: formatted.nextAction,
        nextInstructions: `Step "${failedStep}" failed. See ${logFile} for details.`,
        failedStep,
        logFile,
      }
    }

    return {
      success: false,
      nextAction: formatted.nextAction,
      nextInstructions: formatted.instructions,
      failedStep,
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

  const instructions = ['All checks passed. PR is ready for human review.', '']
  if (ctx.prUrl) {
    instructions.push(`PR URL: ${ctx.prUrl}`, '')
  }
  instructions.push('ACTION: Inform the user that the PR is ready for review.')

  return {
    success: true,
    nextAction: 'done',
    nextInstructions: instructions.join('\n'),
    prUrl: ctx.prUrl,
  }
}
