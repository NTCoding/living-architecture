import { z } from 'zod'

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

const stepSuccessSchema = z.object({
  type: z.literal('success'),
  output: z.unknown().optional(),
})

const stepFailureSchema = z.object({
  type: z.literal('failure'),
  details: z.unknown(),
})

const stepResultSchema = z.discriminatedUnion('type', [stepSuccessSchema, stepFailureSchema])
export type StepResult = z.infer<typeof stepResultSchema>

const workflowResultSchema = z.object({
  success: z.boolean(),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
})
export type WorkflowResult = z.infer<typeof workflowResultSchema>

export type Step<T extends BaseContext> = (ctx: T) => Promise<StepResult>

export function success(output?: unknown): StepResult {
  return {
    type: 'success',
    output,
  }
}

export function failure(details: unknown): StepResult {
  return {
    type: 'failure',
    details,
  }
}

export function workflow<T extends BaseContext>(steps: Step<T>[]) {
  return async (ctx: T): Promise<WorkflowResult> => {
    for (const step of steps) {
      const result = await step(ctx)

      if (result.type === 'failure') {
        return {
          success: false,
          error: result.details,
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
