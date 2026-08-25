/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function deduplicateStrings(existing: string[], incoming: string[]): string[] {
  const existingSet = new Set(existing)
  return incoming.filter((item) => !existingSet.has(item))
}
