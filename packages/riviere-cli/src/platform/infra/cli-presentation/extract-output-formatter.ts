import { type DraftComponent } from '@living-architecture/riviere-extract-ts'

/* v8 ignore start -- @preserve: trivial comparator, Map keys guarantee a !== b */
function compareByCodePoint(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
/* v8 ignore stop */

/* v8 ignore start -- @preserve: dry-run output formatting; tested via CLI integration */
export function formatDryRunOutput(components: DraftComponent[]): string[] {
  const countsByDomain = new Map<string, Map<string, number>>()

  for (const component of components) {
    const existingTypeCounts = countsByDomain.get(component.domain)
    const typeCounts = existingTypeCounts ?? new Map<string, number>()
    if (existingTypeCounts === undefined) {
      countsByDomain.set(component.domain, typeCounts)
    }
    const currentCount = typeCounts.get(component.type) ?? 0
    typeCounts.set(component.type, currentCount + 1)
  }

  const sortedDomains = [...countsByDomain.entries()].sort(([a], [b]) => compareByCodePoint(a, b))
  const lines: string[] = []
  for (const [domain, typeCounts] of sortedDomains) {
    const typeStrings = [...typeCounts.entries()]
      .sort(([a], [b]) => compareByCodePoint(a, b))
      .map(([type, count]) => `${type}(${count})`)
    lines.push(`${domain}: ${typeStrings.join(', ')}`)
  }
  return lines
}
/* v8 ignore stop */
