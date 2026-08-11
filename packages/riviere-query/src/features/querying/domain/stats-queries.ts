import type { RiviereGraph, DomainOpComponent } from '@living-architecture/riviere-schema'

/** @riviere-role value-object */
export interface GraphStats {
  componentCount: number
  linkCount: number
  domainCount: number
  apiCount: number
  entityCount: number
  eventCount: number
}

/** @riviere-role domain-service */
export function queryStats(graph: RiviereGraph): GraphStats {
  const components = graph.components

  const uniqueDomains = new Set(components.map((c) => c.domain))

  const domainOps = components.filter((c): c is DomainOpComponent => c.type === 'DomainOp')
  const uniqueEntities = new Set(domainOps.filter((c) => c.entity).map((c) => c.entity))

  return {
    componentCount: components.length,
    linkCount: graph.links.length,
    domainCount: uniqueDomains.size,
    apiCount: components.filter((c) => c.type === 'API').length,
    entityCount: uniqueEntities.size,
    eventCount: components.filter((c) => c.type === 'Event').length,
  }
}
