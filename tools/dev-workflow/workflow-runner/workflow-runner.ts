import { z } from 'zod'

export type NextAction = 'fix_errors' | 'fix_review' | 'resolve_feedback' | 'done'

export type StepResult =
  | {
    type: 'success'
    output?: unknown
  }
  | {
    type: 'failure'
    nextAction: NextAction
    details: unknown
  }

export interface WorkflowContext {
  branch: string
  prNumber?: number
  prUrl?: string
  // Complete-task specific (optional for other commands)
  reviewDir?: string
  hasIssue?: boolean
  issueNumber?: number
  taskDetails?: {
    title: string
    body: string
  }
  commitMessage?: string
  prTitle?: string
  prBody?: string
  // Generic output storage
  output?: unknown
}

interface FailedReviewer {
  name: string
  summary: string
  reportPath: string
}

export interface WorkflowResult {
  success: boolean
  nextAction: NextAction
  nextInstructions: string
  output?: unknown
  prUrl?: string
  failedReviewers?: FailedReviewer[]
}

export type Step = (ctx: WorkflowContext) => Promise<StepResult>

export function success(output?: unknown): StepResult {
  return {
    type: 'success',
    output,
  }
}

export function failure(nextAction: NextAction, details: unknown): StepResult {
  return {
    type: 'failure',
    nextAction,
    details,
  }
}

const failedReviewerSchema = z.object({
  name: z.string(),
  summary: z.string(),
  reportPath: z.string(),
})

const failedReviewerArraySchema = z.array(failedReviewerSchema)

function isFailedReviewerArray(value: unknown): value is FailedReviewer[] {
  return failedReviewerArraySchema.safeParse(value).success
}

function formatInstructions(result: StepResult & { type: 'failure' }): string {
  if (result.nextAction === 'fix_errors') {
    return [
      'Build, lint, or test errors found.',
      '',
      'ERRORS:',
      String(result.details),
      '',
      'ACTION: Fix the errors above, then re-run /complete-task.',
    ].join('\n')
  }

  if (result.nextAction === 'fix_review') {
    if (isFailedReviewerArray(result.details)) {
      const reports = result.details.map((f) => `- ${f.reportPath}: ${f.summary}`).join('\n')
      return [
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
      ].join('\n')
    }
    return [
      'Code review found issues:',
      String(result.details),
      '',
      'ACTION: Fix the issues and re-run /complete-task.',
    ].join('\n')
  }

  if (result.nextAction === 'resolve_feedback') {
    return [
      'PR has unresolved review feedback from humans.',
      '',
      'ACTION: Address each feedback item, then re-run /complete-task.',
    ].join('\n')
  }

  return String(result.details)
}

async function executeStep(step: Step, ctx: WorkflowContext): Promise<StepResult> {
  try {
    return await step(ctx)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return failure('fix_errors', `Step failed with error: ${errorMessage}`)
  }
}

export function workflow(steps: Step[]) {
  return async (initialContext: WorkflowContext): Promise<WorkflowResult> => {
    const ctx = initialContext

    for (const step of steps) {
      const result = await executeStep(step, ctx)

      if (result.type === 'failure') {
        const failedReviewers =
          result.nextAction === 'fix_review' && isFailedReviewerArray(result.details)
            ? result.details
            : undefined

        return {
          success: false,
          nextAction: result.nextAction,
          nextInstructions: formatInstructions(result),
          failedReviewers,
        }
      }

      // Store step output in context for final result
      if (result.output !== undefined) {
        ctx.output = result.output
      }
    }

    // Return output if workflow produced one, otherwise standard success
    if (ctx.output !== undefined) {
      return {
        success: true,
        nextAction: 'done',
        nextInstructions: 'Workflow completed successfully.',
        output: ctx.output,
      }
    }

    return {
      success: true,
      nextAction: 'done',
      nextInstructions: [
        'All checks passed. PR is ready for human review.',
        '',
        `PR URL: ${ctx.prUrl}`,
        '',
        'ACTION: Inform the user that the PR is ready for review.',
      ].join('\n'),
      prUrl: ctx.prUrl,
    }
  }
}
