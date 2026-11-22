import { z } from 'zod'

const STEP_IDENTIFIER_SCHEMA = z.string().trim().min(1)

/**
 * A step takes its turn in one of three ways beyond plain order: looped until the plan is done,
 * together with the other steps of its group, or once for every item the step before it produced,
 * a few items at a time. A step can also be chosen: it runs only when the workflow says so, and is
 * skipped in plain sight when it does not.
 */
const STEP_TURN_SCHEMA = z
  .object({
    looped: z.boolean().default(false),
    group: z.string().trim().min(1).nullable().default(null),
    atOnce: z.number().int().positive().nullable().default(null),
    chosen: z.boolean().default(false),
  })
  .refine(
    (turn) =>
      [turn.looped, turn.group !== null, turn.atOnce !== null].filter((taken) => taken).length <= 1,
    'A step takes one turn only.',
  )

/** @riviere-role domain-error */
export class InvalidWorkflowStep extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidWorkflowStep'
  }
}

/** @riviere-role value-object */
export class WorkflowStep {
  declare private readonly brand: 'WorkflowStep'

  private constructor(
    private readonly identifier: string,
    private readonly looped: boolean,
    private readonly groupName: string | null,
    private readonly itemsAtOnce: number | null,
    private readonly onlyWhenChosen: boolean,
  ) {}

  static parse(input: {
    readonly id: string
    readonly looped?: boolean
    readonly group?: string
    readonly atOnce?: number
    readonly chosen?: boolean
  }): WorkflowStep {
    const identifier = STEP_IDENTIFIER_SCHEMA.safeParse(input.id)
    if (!identifier.success) {
      throw new InvalidWorkflowStep(`A workflow step needs a name: ${input.id}`)
    }
    const turn = STEP_TURN_SCHEMA.safeParse(input)
    if (!turn.success) {
      throw new InvalidWorkflowStep(`The step ${identifier.data} takes no turn a plan can run.`)
    }
    return new WorkflowStep(
      identifier.data,
      turn.data.looped,
      turn.data.group,
      turn.data.atOnce,
      turn.data.chosen,
    )
  }

  id(): string {
    return this.identifier
  }

  isLooped(): boolean {
    return this.looped
  }

  isChosen(): boolean {
    return this.onlyWhenChosen
  }

  group(): string | null {
    return this.groupName
  }

  atOnce(): number | null {
    return this.itemsAtOnce
  }
}
