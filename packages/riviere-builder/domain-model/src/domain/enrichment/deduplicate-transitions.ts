import type { StateTransition } from '@living-architecture/riviere-schema-published-language/schema'

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function deduplicateStateTransitions(
  existing: StateTransition[],
  incoming: StateTransition[],
): StateTransition[] {
  return incoming.filter(
    (item) =>
      !existing.some((e) => e.from === item.from && e.to === item.to && e.trigger === item.trigger),
  )
}
