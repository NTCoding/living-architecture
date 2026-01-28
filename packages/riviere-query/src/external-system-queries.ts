import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type { ExternalDomain } from './domain-types'
import { parseDomainName } from './domain-types'
import { compareByCodePoint } from './compare-by-code-point'

interface ExternalDomainAccumulator {
  sourceDomains: Set<string>
  connectionCount: number
}

function buildComponentDomainMap(graph: RiviereGraph): Map<string, string> {
  const componentDomains = new Map<string, string>()
  for (const component of graph.components) {
    componentDomains.set(component.id, component.domain)
  }
  return componentDomains
}

function aggregateExternalDomains(
  externalLinks: NonNullable<RiviereGraph['externalLinks']>,
  componentDomains: Map<string, string>,
): Map<string, ExternalDomainAccumulator> {
  const domains = new Map<string, ExternalDomainAccumulator>()

  for (const extLink of externalLinks) {
    const sourceDomain = componentDomains.get(extLink.source)
    if (sourceDomain === undefined) continue

    const existing = domains.get(extLink.target.name)
    if (existing === undefined) {
      domains.set(extLink.target.name, {
        sourceDomains: new Set([sourceDomain]),
        connectionCount: 1,
      })
    } else {
      existing.sourceDomains.add(sourceDomain)
      existing.connectionCount += 1
    }
  }

  return domains
}

function convertToExternalDomains(
  domains: Map<string, ExternalDomainAccumulator>,
): ExternalDomain[] {
  return Array.from(domains.entries())
    .map(([name, acc]) => ({
      name,
      sourceDomains: Array.from(acc.sourceDomains).map((d) => parseDomainName(d)),
      connectionCount: acc.connectionCount,
    }))
    .sort((a, b) => compareByCodePoint(a.name, b.name))
}

/**
 * Returns external domains that components connect to.
 *
 * Each external target from externalLinks becomes a separate ExternalDomain entry,
 * with aggregated connection counts and source domains.
 *
 * @param graph - The RiviereGraph to query
 * @returns Array of ExternalDomain objects, sorted alphabetically by name
 */
export function queryExternalDomains(graph: RiviereGraph): ExternalDomain[] {
  if (graph.externalLinks === undefined || graph.externalLinks.length === 0) {
    return []
  }

  const componentDomains = buildComponentDomainMap(graph)
  const domains = aggregateExternalDomains(graph.externalLinks, componentDomains)
  return convertToExternalDomains(domains)
}
