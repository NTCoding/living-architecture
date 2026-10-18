import { z } from 'zod'

const STEP_IDENTIFIER_SCHEMA = z.string().trim().min(1)

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
  ) {}

  static parse(input: { readonly id: string; readonly looped: boolean }): WorkflowStep {
    const identifier = STEP_IDENTIFIER_SCHEMA.safeParse(input.id)
    if (!identifier.success) {
      throw new InvalidWorkflowStep(`A workflow step needs a name: ${input.id}`)
    }
    return new WorkflowStep(identifier.data, input.looped)
  }

  id(): string {
    return this.identifier
  }

  isLooped(): boolean {
    return this.looped
  }
}
