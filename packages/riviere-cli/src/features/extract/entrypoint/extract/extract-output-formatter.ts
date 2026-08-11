import { type DraftComponent } from '@living-architecture/riviere-extract-ts'

function compareByCodePoint(a: string, b: string): number {
  return a.localeCompare(b)
}

/** @riviere-role cli-output-formatter */
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

  const sortedDomains = [...countsByDomain.keys()].sort(compareByCodePoint)
  const lines: string[] = []
  for (const domain of sortedDomains) {
    const typeCounts = countsByDomain.get(domain)
    /* c8 ignore start -- impossible because sortedDomains comes from countsByDomain keys */
    if (typeCounts === undefined) {
      continue
    }
    /* c8 ignore stop */
    const typeStrings = [...typeCounts.keys()]
      .sort(compareByCodePoint)
      .map((type) => `${type}(${typeCounts.get(type)})`)
    lines.push(`${domain}: ${typeStrings.join(', ')}`)
  }
  return lines
}
