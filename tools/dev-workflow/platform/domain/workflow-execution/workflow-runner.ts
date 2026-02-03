import { z } from 'zod'
import { type StepResult } from './step-result'
import {
  type DebugLog, noopDebugLog 
} from '../debug-log'

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

const stepTimingSchema = z.object({
  name: z.string(),
  durationMs: z.number(),
})
export type StepTiming = z.infer<typeof stepTimingSchema>

const workflowResultSchema = z.object({
  success: z.boolean(),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
  failedStep: z.string().optional(),
  stepTimings: z.array(stepTimingSchema),
  totalDurationMs: z.number(),
})
export type WorkflowResult = z.infer<typeof workflowResultSchema>

export interface Step<T extends BaseContext> {
  name: string
  execute: (ctx: T) => Promise<StepResult>
}

export function workflow<T extends BaseContext>(steps: Step<T>[], debugLog?: DebugLog) {
  const log = debugLog ?? noopDebugLog()
  return async (ctx: T): Promise<WorkflowResult> => {
    const stepTimings: StepTiming[] = []
    const workflowStart = performance.now()

    for (const step of steps) {
      log.log(`step [${step.name}]: start`)
      const stepStart = performance.now()
      const result = await step.execute(ctx)
      const stepDuration = performance.now() - stepStart
      log.log(`step [${step.name}]: done in ${stepDuration.toFixed(0)}ms, result=${result.type}`)

      stepTimings.push({
        name: step.name,
        durationMs: stepDuration,
      })

      if (result.type === 'failure') {
        return {
          success: false,
          error: result.details,
          failedStep: step.name,
          stepTimings,
          totalDurationMs: performance.now() - workflowStart,
        }
      }

      if (result.output !== undefined) {
        ctx.output = result.output
      }
    }

    return {
      success: true,
      output: ctx.output,
      stepTimings,
      totalDurationMs: performance.now() - workflowStart,
    }
  }
}
