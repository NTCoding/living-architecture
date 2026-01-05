import type { StateTransition } from '@living-architecture/riviere-schema';

export function deduplicateStrings(existing: string[], incoming: string[]): string[] {
  const existingSet = new Set(existing);
  return incoming.filter((item) => !existingSet.has(item));
}

export function deduplicateStateTransitions(
  existing: StateTransition[],
  incoming: StateTransition[],
): StateTransition[] {
  return incoming.filter(
    (item) =>
      !existing.some((e) => e.from === item.from && e.to === item.to && e.trigger === item.trigger),
  );
}
