import type { Workflow } from '@mastra/core/workflows'
import type { AdaptWorkflow } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/adapt-workflow'
import type {
  MastraGraphEntry,
  MastraStepDeclaration,
} from '../../../../infra/external-clients/mastra/mastra-workflow'
import { createMastraWorkflow } from '../../../../infra/external-clients/mastra/mastra-workflow'
import { createMastraScorers } from '../../../../infra/external-clients/mastra/mastra-scorer'

/** Half the runs are scored: enough to tell whether a cheaper model holds up, at half the cost. */
const SCORE_EVERY_OTHER_RUN = 0.5

type AdaptRequest = Parameters<AdaptWorkflow<Workflow>>[0]

type BehaviourOf = AdaptRequest['steps'][number]

type PlanStage = ReturnType<AdaptRequest['plan']['stages']>[number]

/**
 * @riviere-role domain-port-adapter
 */
export function adaptWorkflowToMastra(dependencies?: {
  readonly scoreShareOfRuns: number
}): AdaptWorkflow<Workflow> {
  const rate = dependencies?.scoreShareOfRuns ?? SCORE_EVERY_OTHER_RUN
  return async (request) => {
    const first = request.steps[0]
    const last = request.steps[request.steps.length - 1]
    if (first === undefined || last === undefined) throw new WorkflowWithoutSteps(request.plan.id())
    return {
      built: createMastraWorkflow({
        id: request.plan.id(),
        inputSchema: first.inputSchema,
        outputSchema: last.outputSchema,
        entries: request.plan
          .stages()
          .map((stage) => entryFor(stage, request.steps, request.loopUntil, rate)),
        onFailure: request.onFailure,
        onOutcome: request.onOutcome,
      }),
    }
  }
}

function entryFor(
  stage: PlanStage,
  behaviours: readonly BehaviourOf[],
  loopUntil: ((state: unknown) => boolean) | null,
  rate: number,
): MastraGraphEntry {
  if (stage.kind === 'together') {
    return {
      kind: 'together',
      steps: stage.steps.map((step) => declarationFor(step.id(), behaviours, rate)),
    }
  }
  const declaration = declarationFor(stage.step.id(), behaviours, rate)
  const atOnce = stage.step.atOnce()
  if (atOnce !== null) return { kind: 'for-each', step: declaration, atOnce }
  if (!stage.step.isLooped()) return { kind: 'one', step: declaration }
  if (loopUntil === null) throw new LoopWithoutAnEnd(stage.step.id())
  return { kind: 'looped', step: declaration, until: loopUntil }
}

function declarationFor(
  id: string,
  behaviours: readonly BehaviourOf[],
  rate: number,
): MastraStepDeclaration {
  const found = behaviours.find((behaviour) => behaviour.id === id)
  if (found === undefined) throw new WorkflowWithoutSteps(id)
  const score = found.scoreWith
  if (score === null) return { ...found, scorers: {} }
  return {
    ...found,
    scorers: createMastraScorers({
      id: `${id}-quality`,
      description: `How well the ${id} step did its work, so a cheaper model can be judged on it.`,
      rate,
      score,
    }),
  }
}

class WorkflowWithoutSteps extends Error {
  constructor(id: string) {
    super(`The workflow ${id} has a step with no behaviour.`)
    this.name = 'WorkflowWithoutSteps'
  }
}

class LoopWithoutAnEnd extends Error {
  constructor(id: string) {
    super(`The step ${id} loops but the workflow does not say when the loop ends.`)
    this.name = 'LoopWithoutAnEnd'
  }
}
