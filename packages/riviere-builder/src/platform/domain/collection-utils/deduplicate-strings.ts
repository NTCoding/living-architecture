export function deduplicateStrings(existing: string[], incoming: string[]): string[] {
  const existingSet = new Set(existing)
  return incoming.filter((item) => !existingSet.has(item))
}
