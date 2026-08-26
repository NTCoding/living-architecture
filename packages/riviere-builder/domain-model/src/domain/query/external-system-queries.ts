import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { CodePointSequence } from './code-point-sequence'
import { DomainName } from './domain-name'
import { ExternalDomain } from './external-domain'

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
    .map(([name, acc]) =>
      ExternalDomain.parse({
        name,
        sourceDomains: Array.from(acc.sourceDomains).map((d) => DomainName.parse(d)),
        connectionCount: acc.connectionCount,
      }),
    )
    .sort((a, b) =>
      CodePointSequence.parse(a.name)
        .positionRelativeTo(CodePointSequence.parse(b.name))
        .asAscendingArraySortResult(),
    )
}

/**
 * Returns external domains that components connect to.
 *
 * Each external target from externalLinks becomes a separate ExternalDomain entry,
 * with aggregated connection counts and source domains.
 *
 * @param graph - The RiviereGraph to query
 * @returns Array of ExternalDomain objects, sorted alphabetically by name
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function queryExternalDomains(graph: RiviereGraph): ExternalDomain[] {
  if (graph.externalLinks === undefined || graph.externalLinks.length === 0) {
    return []
  }

  const componentDomains = buildComponentDomainMap(graph)
  const domains = aggregateExternalDomains(graph.externalLinks, componentDomains)
  return convertToExternalDomains(domains)
}
