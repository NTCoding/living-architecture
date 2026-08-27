import { z } from 'zod'

/** @riviere-role value-object */
export class ReflectingState {
  declare private readonly brand: 'ReflectingState'

  readonly name: 'REFLECTING'
  readonly emoji = '🪞'
  readonly agentInstructions = 'states/reflecting.md'
  readonly canTransitionTo = ['COMPLETE', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = [] as const
  readonly forbidden = { write: true } as const

  private constructor(name: 'REFLECTING') {
    this.name = name
  }

  static parse(value: unknown): ReflectingState {
    z.literal('REFLECTING').parse(value)
    return new ReflectingState('REFLECTING')
  }
}
