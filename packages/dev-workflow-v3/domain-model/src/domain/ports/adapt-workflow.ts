import type { z } from 'zod'
import type { WorkflowPlan } from '../workflow/workflow-plan'

/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow runs on a framework, and the framework is not our domain. This port takes our workflow plan, which holds the steps and the loop, together with the behaviour each step runs, and returns the same workflow expressed in a framework. The built type is left to the adapter, so the domain model depends on no framework.
 */
export type AdaptWorkflow<Built> = (request: {
  readonly plan: WorkflowPlan
  readonly loopUntil: ((state: unknown) => boolean) | null
  readonly steps: readonly {
    readonly id: string
    readonly inputSchema: z.ZodType<unknown>
    readonly outputSchema: z.ZodType<unknown>
    readonly suspendSchema: z.ZodType<unknown> | null
    readonly resumeSchema: z.ZodType<unknown> | null
    readonly run: (behaviour: {
      readonly data: unknown
      readonly resumeData: unknown
      readonly suspend: (payload: unknown) => Promise<unknown>
      readonly workflow: (id: string) => {
        readonly start: (request: {
          readonly runId: string
          readonly input: unknown
        }) => Promise<{ readonly status: string; readonly result: unknown }>
      }
    }) => Promise<unknown>
  }[]
}) => Promise<{ readonly built: Built }>
