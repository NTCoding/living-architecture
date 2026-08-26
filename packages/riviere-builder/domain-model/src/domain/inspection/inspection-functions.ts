import type {
  Component,
  CustomTypeDefinition,
  DomainMetadata,
  ExternalLink,
  Link,
  SourceInfo,
  RelationshipTypeDefinition,
} from '@living-architecture/riviere-schema-published-language/schema'
import { ComponentSummaryStats } from './component-summary-stats'

type InspectionWarning =
  | Readonly<{
      code: 'ORPHAN_COMPONENT'
      message: string
      componentId: string
    }>
  | Readonly<{
      code: 'UNUSED_DOMAIN'
      message: string
      domainName: string
    }>

interface InspectionGraph {
  version: string
  metadata: {
    name?: string
    description?: string
    generated?: string
    sources: readonly SourceInfo[]
    domains: Readonly<Record<string, DomainMetadata>>
    customTypes: Readonly<Record<string, CustomTypeDefinition>>
    relationshipTypes: Readonly<Record<string, RelationshipTypeDefinition>>
  }
  components: readonly Component[]
  links: readonly Link[]
  externalLinks: readonly ExternalLink[]
}

/**
 * Finds components with no incoming or outgoing links.
 *
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 *
 * @param graph - The graph to inspect
 * @returns Array of orphaned component IDs
 *
 * @example
 * ```typescript
 * const orphans = findOrphans(graph)
 * // ['orders:checkout:api:unused-endpoint']
 * ```
 */
export function findOrphans(graph: InspectionGraph): string[] {
  const connectedIds = new Set<string>()

  for (const link of graph.links) {
    connectedIds.add(link.source)
    connectedIds.add(link.target)
  }

  for (const externalLink of graph.externalLinks) {
    connectedIds.add(externalLink.source)
  }

  return graph.components.filter((c) => !connectedIds.has(c.id)).map((c) => c.id)
}

/**
 * Calculates statistics about the graph.
 *
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 *
 * @param graph - The graph to analyze
 * @returns Object with component counts, link counts, and domain count
 *
 * @example
 * ```typescript
 * const stats = calculateStats(graph)
 * // { componentCount: 10, linkCount: 8, domainCount: 2, ... }
 * ```
 */
export function calculateStats(graph: InspectionGraph) {
  const components = graph.components
  return ComponentSummaryStats.parse({
    componentCount: components.length,
    componentsByType: {
      UI: components.filter((c) => c.type === 'UI').length,
      API: components.filter((c) => c.type === 'API').length,
      UseCase: components.filter((c) => c.type === 'UseCase').length,
      DomainOp: components.filter((c) => c.type === 'DomainOp').length,
      Event: components.filter((c) => c.type === 'Event').length,
      EventHandler: components.filter((c) => c.type === 'EventHandler').length,
      Custom: components.filter((c) => c.type === 'Custom').length,
    },
    linkCount: graph.links.length,
    externalLinkCount: graph.externalLinks.length,
    domainCount: Object.keys(graph.metadata.domains).length,
  })
}

/**
 * Finds non-fatal issues in the graph.
 *
 * Detects orphaned components and unused domains.
 *
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 *
 * @param graph - The graph to inspect
 * @param orphanComponentIds - Components previously found to have no connections
 * @returns Array of warning objects
 *
 * @example
 * ```typescript
 * const warnings = findWarnings(graph)
 * // [{ code: 'ORPHAN_COMPONENT', message: '...', componentId: '...' }]
 * ```
 */
export function findWarnings(
  graph: InspectionGraph,
  orphanComponentIds: readonly string[],
): InspectionWarning[] {
  const warnings: InspectionWarning[] = []

  for (const id of orphanComponentIds) {
    warnings.push({
      code: 'ORPHAN_COMPONENT',
      message: `Component '${id}' has no incoming or outgoing links`,
      componentId: id,
    })
  }

  const usedDomains = new Set(graph.components.map((c) => c.domain))
  for (const domain of Object.keys(graph.metadata.domains)) {
    if (!usedDomains.has(domain)) {
      warnings.push({
        code: 'UNUSED_DOMAIN',
        message: `Domain '${domain}' is declared but has no components`,
        domainName: domain,
      })
    }
  }

  return warnings
}
