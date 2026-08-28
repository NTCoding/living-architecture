import type { StateTransition } from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role value-object */
export class StateTransitions {
  declare private readonly brand: 'StateTransitions'

  private constructor(readonly values: readonly StateTransition[]) {}

  static parse(values: readonly StateTransition[] | undefined): StateTransitions {
    return new StateTransitions(unique(values ?? []))
  }

  including(incoming: readonly StateTransition[] | undefined): StateTransitions {
    if (incoming === undefined || incoming.length === 0) return this
    const combined = unique([...this.values, ...incoming])
    return combined.length === this.values.length ? this : new StateTransitions(combined)
  }
}

function unique(values: readonly StateTransition[]): readonly StateTransition[] {
  const transitionKeys = new Set<string>()
  return values.filter((transition) => {
    const key = JSON.stringify([transition.from, transition.to, transition.trigger])
    if (transitionKeys.has(key)) return false
    transitionKeys.add(key)
    return true
  })
}
