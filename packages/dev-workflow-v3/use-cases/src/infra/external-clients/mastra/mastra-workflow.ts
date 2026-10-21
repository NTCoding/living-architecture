import { createStep, createWorkflow } from '@mastra/core/workflows'
import type { DefaultEngineType, Step, Workflow } from '@mastra/core/workflows'
import type { MastraScorers } from '@mastra/core/evals'
import type { z } from 'zod'

/**
 * The same graph, seen as one whose last step handed on an array. Mastra only offers `foreach`
 * on a graph shaped that way, and the plan already guarantees a step before every `for-each`.
 */
type GraphOverAnArray = Workflow<
  DefaultEngineType,
  Step<string, unknown, unknown, unknown, unknown, unknown, DefaultEngineType>[],
  string,
  unknown,
  unknown,
  unknown,
  unknown[]
>

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
  readonly stopEarly: (outcome: unknown) => Promise<unknown>
  readonly workflow: (id: string) => MastraNestedWorkflow
}

/** @riviere-role external-client-model */
export interface MastraStepDeclaration {
  readonly id: string
  readonly inputSchema: z.ZodType<unknown>
  readonly outputSchema: z.ZodType<unknown>
  readonly suspendSchema: z.ZodType<unknown> | null
  readonly resumeSchema: z.ZodType<unknown> | null
  readonly attempts: number | null
  readonly scorers: MastraScorers
  readonly run: (behaviour: MastraStepBehaviour) => Promise<unknown>
}

/** @riviere-role external-client-model */
export type MastraGraphEntry =
  | { readonly kind: 'one'; readonly step: MastraStepDeclaration }
  | {
      readonly kind: 'looped'
      readonly step: MastraStepDeclaration
      readonly until: (state: unknown) => boolean
    }
  | { readonly kind: 'together'; readonly steps: readonly MastraStepDeclaration[] }
  | { readonly kind: 'for-each'; readonly step: MastraStepDeclaration; readonly atOnce: number }

/** @riviere-role external-client-model */
export interface MastraWorkflowFailure {
  readonly workflowId: string
  readonly runId: string
  readonly message: string
  readonly startedWith: unknown
}

/** @riviere-role external-client-model */
export interface MastraWorkflowOutcome {
  readonly workflowId: string
  readonly runId: string
  readonly status: string
}

/** @riviere-role external-client-model */
export interface MastraWorkflowDeclaration {
  readonly id: string
  readonly inputSchema: z.ZodType<unknown>
  readonly outputSchema: z.ZodType<unknown>
  readonly entries: readonly MastraGraphEntry[]
  readonly onFailure: ((failure: MastraWorkflowFailure) => Promise<void>) | null
  readonly onOutcome: ((outcome: MastraWorkflowOutcome) => Promise<void>) | null
}

/**
 * @riviere-role external-client-service
 */
export function createMastraWorkflow(declaration: MastraWorkflowDeclaration): Workflow {
  if (declaration.entries.length === 0) throw new EmptyWorkflow(declaration.id)
  const graph = declaration.entries.reduce<Workflow>(
    (current, entry) => addEntry(current, entry),
    createWorkflow({
      id: declaration.id,
      inputSchema: declaration.inputSchema,
      outputSchema: declaration.outputSchema,
      options: watchers(declaration),
    }),
  )
  return graph.commit()
}

function watchers(declaration: MastraWorkflowDeclaration) {
  const onFailure = declaration.onFailure
  const onOutcome = declaration.onOutcome
  return {
    ...(onFailure === null ? {} : { onError: reportFailureWith(onFailure) }),
    ...(onOutcome === null ? {} : { onFinish: reportOutcomeWith(onOutcome) }),
  }
}

/**
 * @riviere-role external-client-service
 */
export function mastraRunFailure(info: {
  readonly error?: { readonly message?: string }
  readonly runId: string
  readonly workflowId: string
  readonly getInitData: () => unknown
}): MastraWorkflowFailure {
  return {
    workflowId: info.workflowId,
    runId: info.runId,
    message: info.error?.message ?? 'The run stopped without saying why.',
    startedWith: info.getInitData(),
  }
}

function reportFailureWith(onFailure: (failure: MastraWorkflowFailure) => Promise<void>) {
  return async (info: {
    readonly error?: { readonly message?: string }
    readonly runId: string
    readonly workflowId: string
    readonly getInitData: () => unknown
  }): Promise<void> => {
    await onFailure(mastraRunFailure(info))
  }
}

function reportOutcomeWith(onOutcome: (outcome: MastraWorkflowOutcome) => Promise<void>) {
  return async (result: {
    readonly status: string
    readonly runId: string
    readonly workflowId: string
  }): Promise<void> => {
    await onOutcome({
      workflowId: result.workflowId,
      runId: result.runId,
      status: result.status,
    })
  }
}

function addEntry(graph: Workflow, entry: MastraGraphEntry): Workflow {
  switch (entry.kind) {
    case 'one':
      return graph.then(createMastraStep(entry.step))
    case 'looped':
      return graph.dountil(createMastraStep(entry.step), async ({ inputData }) =>
        entry.until(inputData),
      )
    case 'together':
      return graph.parallel(entry.steps.map((step) => createMastraStep(step)))
    case 'for-each':
      return forEachItem(graph, entry.step, entry.atOnce)
  }
}

function forEachItem(graph: Workflow, step: MastraStepDeclaration, atOnce: number): Workflow {
  const overAnArray: GraphOverAnArray = graph
  const afterEveryItem: GraphOverAnArray = overAnArray.foreach(createMastraStep(step), {
    concurrency: atOnce,
  })
  return afterEveryItem
}

function createMastraStep(declaration: MastraStepDeclaration) {
  return createStep({
    id: declaration.id,
    inputSchema: declaration.inputSchema,
    outputSchema: declaration.outputSchema,
    ...(declaration.suspendSchema === null ? {} : { suspendSchema: declaration.suspendSchema }),
    ...(declaration.resumeSchema === null ? {} : { resumeSchema: declaration.resumeSchema }),
    ...(declaration.attempts === null ? {} : { retries: declaration.attempts }),
    scorers: declaration.scorers,
    execute: async ({ inputData, resumeData, suspend, bail, mastra }) =>
      declaration.run({
        data: inputData,
        resumeData,
        suspend: async (payload) => await suspend(payload),
        stopEarly: async (outcome) => bail(outcome),
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
