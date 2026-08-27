import { z } from 'zod'

/** @riviere-role value-object */
export class CompleteState {
  declare private readonly brand: 'CompleteState'

  readonly name: 'COMPLETE'
  readonly emoji = '✅'
  readonly agentInstructions = 'states/complete.md'
  readonly allowIdle = true
  readonly canTransitionTo = [] as const
  readonly allowedWorkflowOperations = [] as const
  readonly forbidden = { write: true } as const

  private constructor(name: 'COMPLETE') {
    this.name = name
  }

  static parse(value: unknown): CompleteState {
    z.literal('COMPLETE').parse(value)
    return new CompleteState('COMPLETE')
  }
}
