const PLANNING_STEPS = [
  'problem-definition',
  'solution-exploration',
  'prd',
  'architecture',
  'dogfooding',
  'delivery-planning',
] as const

type PlanningStepName = (typeof PLANNING_STEPS)[number]

/** @riviere-role domain-error */
export class UnknownPlanningStep extends Error {
  constructor(name: string) {
    super(
      `A planning step is one of ${PLANNING_STEPS.join(', ')}: ${name}. The factory never skips a step and never invents one.`,
    )
    this.name = 'UnknownPlanningStep'
  }
}

/** @riviere-role domain-error */
export class NotAnEarlierStep extends Error {
  constructor(from: PlanningStepName, to: PlanningStepName) {
    super(`An epic at ${from} cannot be sent back to ${to}, because ${to} is not an earlier step.`)
    this.name = 'NotAnEarlierStep'
  }
}

/**
 * @riviere-role value-object
 */
export class PlanningStep {
  declare private readonly brand: 'PlanningStep'

  private constructor(private readonly step: PlanningStepName) {}

  static from(value: string): PlanningStep {
    const known = PLANNING_STEPS.find((step) => step === value)
    if (known === undefined) throw new UnknownPlanningStep(value)
    return new PlanningStep(known)
  }

  name(): PlanningStepName {
    return this.step
  }

  next(): PlanningStep | null {
    const following = PLANNING_STEPS[PLANNING_STEPS.indexOf(this.step) + 1]
    return following === undefined ? null : PlanningStep.from(following)
  }

  isBefore(other: PlanningStep): boolean {
    return PLANNING_STEPS.indexOf(this.step) < PLANNING_STEPS.indexOf(other.step)
  }

  equals(other: PlanningStep): boolean {
    return this.step === other.name()
  }
}
