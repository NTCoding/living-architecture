import type { z } from 'zod'
import type { WorkflowPlan } from '../workflow/workflow-plan'

/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow runs on a framework, and the framework is not our domain. This port takes our workflow plan, which holds the steps, the loop, the steps that take their turn together and the step that runs once per item, together with the behaviour each step runs, and returns the same workflow expressed in a framework. The built type is left to the adapter, so the domain model depends on no framework.
 */
export type AdaptWorkflow<Built> = (request: {
  readonly plan: WorkflowPlan
  readonly loopUntil: ((state: unknown) => boolean) | null
  readonly onFailure:
    | ((failure: {
        readonly workflowId: string
        readonly runId: string
        readonly message: string
        readonly startedWith: unknown
      }) => Promise<void>)
    | null
  readonly onOutcome:
    | ((outcome: {
        readonly workflowId: string
        readonly runId: string
        readonly status: string
      }) => Promise<void>)
    | null
  readonly steps: readonly {
    readonly id: string
    readonly inputSchema: z.ZodType<unknown>
    readonly outputSchema: z.ZodType<unknown>
    readonly suspendSchema: z.ZodType<unknown> | null
    readonly resumeSchema: z.ZodType<unknown> | null
    readonly retries: number | null
    readonly scoreWith:
      | ((judged: { readonly data: unknown; readonly outcome: unknown }) => number)
      | null
    readonly run: (behaviour: {
      readonly data: unknown
      readonly resumeData: unknown
      readonly suspend: (payload: unknown) => Promise<unknown>
      readonly stopEarly: (outcome: unknown) => Promise<unknown>
      readonly workflow: (id: string) => {
        readonly start: (request: {
          readonly runId: string
          readonly input: unknown
        }) => Promise<{ readonly status: string; readonly result: unknown }>
      }
    }) => Promise<unknown>
  }[]
}) => Promise<{ readonly built: Built }>
