import { z } from 'zod'
import { WorkflowStep } from './workflow-step'

const WORKFLOW_IDENTIFIER_SCHEMA = z.string().trim().min(1)

/** @riviere-role domain-error */
export class InvalidWorkflowPlan extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidWorkflowPlan'
  }
}

/** @riviere-role value-object */
export class WorkflowPlan {
  declare private readonly brand: 'WorkflowPlan'

  private constructor(
    private readonly identifier: string,
    private readonly planSteps: readonly WorkflowStep[],
  ) {}

  static parse(input: {
    readonly id: string
    readonly steps: readonly { readonly id: string; readonly looped: boolean }[]
  }): WorkflowPlan {
    const identifier = parseIdentifier(input.id)
    if (input.steps.length === 0) {
      throw new InvalidWorkflowPlan(`The workflow ${identifier} has no steps.`)
    }
    const steps = input.steps.map((step) => WorkflowStep.parse(step))
    assertUniqueIds(identifier, steps)
    assertOneLoopAtMost(identifier, steps)
    return new WorkflowPlan(identifier, steps)
  }

  id(): string {
    return this.identifier
  }

  steps(): readonly WorkflowStep[] {
    return this.planSteps
  }

  loopedStep(): WorkflowStep | undefined {
    return this.planSteps.find((step) => step.isLooped())
  }
}

function parseIdentifier(id: string): string {
  const identifier = WORKFLOW_IDENTIFIER_SCHEMA.safeParse(id)
  if (!identifier.success) {
    throw new InvalidWorkflowPlan(`A workflow needs a name: ${id}`)
  }
  return identifier.data
}

function assertUniqueIds(workflowId: string, steps: readonly WorkflowStep[]): void {
  const ids = steps.map((step) => step.id())
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicates.length > 0) {
    throw new InvalidWorkflowPlan(
      `The workflow ${workflowId} names a step twice: ${duplicates.join(', ')}.`,
    )
  }
}

function assertOneLoopAtMost(workflowId: string, steps: readonly WorkflowStep[]): void {
  const looped = steps.filter((step) => step.isLooped())
  if (looped.length > 1) {
    throw new InvalidWorkflowPlan(
      `The workflow ${workflowId} loops over more than one step: ${looped
        .map((step) => step.id())
        .join(', ')}.`,
    )
  }
}
