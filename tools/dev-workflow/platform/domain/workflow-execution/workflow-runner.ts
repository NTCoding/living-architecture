import { z } from 'zod'
import { type StepResult } from './step-result'

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export const baseContextSchema = z.object({
  branch: z.string(),
  output: z.unknown().optional(),
})
export type BaseContext = z.infer<typeof baseContextSchema>

export const taskDetailsSchema = z.object({
  title: z.string(),
  body: z.string(),
})
export type TaskDetails = z.infer<typeof taskDetailsSchema>

const workflowResultSchema = z.object({
  success: z.boolean(),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
  failedStep: z.string().optional(),
})
export type WorkflowResult = z.infer<typeof workflowResultSchema>

export interface Step<T extends BaseContext> {
  name: string
  execute: (ctx: T) => Promise<StepResult>
}

export function workflow<T extends BaseContext>(steps: Step<T>[]) {
  return async (ctx: T): Promise<WorkflowResult> => {
    for (const step of steps) {
      const result = await step.execute(ctx)

      if (result.type === 'failure') {
        return {
          success: false,
          error: result.details,
          failedStep: step.name,
        }
      }

      if (result.output !== undefined) {
        ctx.output = result.output
      }
    }

    return {
      success: true,
      output: ctx.output,
    }
  }
}
