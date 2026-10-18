import type { Workflow } from '@mastra/core/workflows'
import type { AdaptWorkflow } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/adapt-workflow'
import type { MastraStepDeclaration } from '../../../../infra/external-clients/mastra/mastra-workflow'
import { createMastraWorkflow } from '../../../../infra/external-clients/mastra/mastra-workflow'

/**
 * @riviere-role domain-port-adapter
 */
export function adaptWorkflowToMastra(): AdaptWorkflow<Workflow> {
  return async (request) => {
    const first = request.steps[0]
    const last = request.steps[request.steps.length - 1]
    if (first === undefined || last === undefined) throw new WorkflowWithoutSteps(request.plan.id())
    return {
      built: createMastraWorkflow({
        id: request.plan.id(),
        inputSchema: first.inputSchema,
        outputSchema: last.outputSchema,
        steps: inPlanOrder(request.plan, request.steps),
        loopedStepId: request.plan.loopedStep()?.id() ?? null,
        loopUntil: request.loopUntil,
      }),
    }
  }
}

function inPlanOrder(
  plan: Parameters<AdaptWorkflow<Workflow>>[0]['plan'],
  declarations: readonly MastraStepDeclaration[],
): readonly MastraStepDeclaration[] {
  return plan.steps().map((step) => {
    const found = declarations.find((declaration) => declaration.id === step.id())
    if (found === undefined) throw new WorkflowWithoutSteps(step.id())
    return found
  })
}

class WorkflowWithoutSteps extends Error {
  constructor(id: string) {
    super(`The workflow ${id} has a step with no behaviour.`)
    this.name = 'WorkflowWithoutSteps'
  }
}
