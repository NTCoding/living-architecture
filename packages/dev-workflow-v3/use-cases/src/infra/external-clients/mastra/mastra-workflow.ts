import { createStep, createWorkflow } from '@mastra/core/workflows'
import type { Step, Workflow } from '@mastra/core/workflows'
import type { z } from 'zod'

/** @riviere-role external-client-model */
export interface MastraNestedWorkflow {
  readonly start: (request: {
    readonly runId: string
    readonly input: unknown
  }) => Promise<{ readonly status: string; readonly result: unknown }>
}

/** @riviere-role external-client-model */
export interface MastraStepBehaviour {
  readonly data: unknown
  readonly resumeData: unknown
  readonly suspend: (payload: unknown) => Promise<unknown>
  readonly workflow: (id: string) => MastraNestedWorkflow
}

/** @riviere-role external-client-model */
export interface MastraStepDeclaration {
  readonly id: string
  readonly inputSchema: z.ZodType<unknown>
  readonly outputSchema: z.ZodType<unknown>
  readonly suspendSchema: z.ZodType<unknown> | null
  readonly resumeSchema: z.ZodType<unknown> | null
  readonly run: (behaviour: MastraStepBehaviour) => Promise<unknown>
}

/** @riviere-role external-client-model */
export interface MastraWorkflowDeclaration {
  readonly id: string
  readonly inputSchema: z.ZodType<unknown>
  readonly outputSchema: z.ZodType<unknown>
  readonly steps: readonly MastraStepDeclaration[]
  readonly loopedStepId: string | null
  readonly loopUntil: ((state: unknown) => boolean) | null
}

/**
 * @riviere-role external-client-service
 */
export function createMastraWorkflow(declaration: MastraWorkflowDeclaration): Workflow {
  if (declaration.steps.length === 0) throw new EmptyWorkflow(declaration.id)
  const loopedIndex = declaration.steps.findIndex((step) => step.id === declaration.loopedStepId)
  const graph = declaration.steps.reduce<Workflow>(
    (current, step, index) => addStep(current, step, index === loopedIndex ? declaration : null),
    createWorkflow({
      id: declaration.id,
      inputSchema: declaration.inputSchema,
      outputSchema: declaration.outputSchema,
    }),
  )
  return graph.commit()
}

function addStep(
  graph: Workflow,
  declaration: MastraStepDeclaration,
  loop: MastraWorkflowDeclaration | null,
): Workflow {
  const step = createMastraStep(declaration)
  const until = loop?.loopUntil ?? null
  if (until === null) return graph.then(step)
  return graph.dountil(step, async ({ inputData }) => until(inputData))
}

function createMastraStep(declaration: MastraStepDeclaration): Step {
  return createStep({
    id: declaration.id,
    inputSchema: declaration.inputSchema,
    outputSchema: declaration.outputSchema,
    ...(declaration.suspendSchema === null ? {} : { suspendSchema: declaration.suspendSchema }),
    ...(declaration.resumeSchema === null ? {} : { resumeSchema: declaration.resumeSchema }),
    execute: async ({ inputData, resumeData, suspend, mastra }) =>
      declaration.run({
        data: inputData,
        resumeData,
        suspend: async (payload) => await suspend(payload),
        workflow: (id) => ({
          start: async (request) => {
            const run = await mastra.getWorkflow(id).createRun({ runId: request.runId })
            const result = await run.start({ inputData: request.input })
            if (result.status !== 'success') return { status: result.status, result: undefined }
            return { status: result.status, result: result.result }
          },
        }),
      }),
  })
}

/** @riviere-role external-client-error */
export class EmptyWorkflow extends Error {
  constructor(id: string) {
    super(`The workflow ${id} has no steps.`)
    this.name = 'EmptyWorkflow'
  }
}
