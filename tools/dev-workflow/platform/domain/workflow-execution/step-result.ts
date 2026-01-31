import { z } from 'zod'

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
