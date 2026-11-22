import { z } from 'zod'
import { WorkflowStep } from './workflow-step'

const WORKFLOW_IDENTIFIER_SCHEMA = z.string().trim().min(1)

/** One turn of the plan: a single step, or the steps of a group that take their turn together. */
type Stage =
  | { readonly kind: 'one'; readonly step: WorkflowStep }
  | { readonly kind: 'together'; readonly group: string; readonly steps: readonly WorkflowStep[] }

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
    readonly steps: readonly {
      readonly id: string
      readonly looped?: boolean
      readonly group?: string
      readonly atOnce?: number
      readonly chosen?: boolean
    }[]
  }): WorkflowPlan {
    const identifier = parseIdentifier(input.id)
    if (input.steps.length === 0) {
      throw new InvalidWorkflowPlan(`The workflow ${identifier} has no steps.`)
    }
    const steps = input.steps.map((step) => WorkflowStep.parse(step))
    assertUniqueIds(identifier, steps)
    assertOneLoopAtMost(identifier, steps)
    assertGroupsStayTogether(identifier, steps)
    assertNoForEachFirst(identifier, steps)
    return new WorkflowPlan(identifier, steps)
  }

  id(): string {
    return this.identifier
  }

  steps(): readonly WorkflowStep[] {
    return this.planSteps
  }

  stages(): readonly (
    | { readonly kind: 'one'; readonly step: WorkflowStep }
    | { readonly kind: 'together'; readonly group: string; readonly steps: readonly WorkflowStep[] }
  )[] {
    return this.planSteps.reduce<readonly Stage[]>((stages, step) => addToStages(stages, step), [])
  }

  loopedStep(): WorkflowStep | undefined {
    return this.planSteps.find((step) => step.isLooped())
  }
}

function addToStages(stages: readonly Stage[], step: WorkflowStep): readonly Stage[] {
  const group = step.group()
  if (group === null) return [...stages, { kind: 'one', step }]
  const last = stages[stages.length - 1]
  if (last === undefined || last.kind === 'one' || last.group !== group) {
    return [...stages, { kind: 'together', group, steps: [step] }]
  }
  return [...stages.slice(0, -1), { kind: 'together', group, steps: [...last.steps, step] }]
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

function assertGroupsStayTogether(workflowId: string, steps: readonly WorkflowStep[]): void {
  const groups = steps.map((step) => step.group())
  const scattered = groups.filter(
    (group, index) =>
      group !== null && groups.indexOf(group) !== index && groups[index - 1] !== group,
  )
  if (scattered.length > 0) {
    throw new InvalidWorkflowPlan(
      `The workflow ${workflowId} splits up steps that run together: ${scattered.join(', ')}.`,
    )
  }
}

function assertNoForEachFirst(workflowId: string, steps: readonly WorkflowStep[]): void {
  const startsWithForEach = steps.some((step, index) => index === 0 && step.atOnce() !== null)
  if (startsWithForEach) {
    throw new InvalidWorkflowPlan(
      `The workflow ${workflowId} starts with a step that runs once for every item, with no step before it to say what to run over.`,
    )
  }
}
