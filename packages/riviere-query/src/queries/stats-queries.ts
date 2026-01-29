import type {
  RiviereGraph, DomainOpComponent 
} from '@living-architecture/riviere-schema'
import type { GraphStats } from './domain-types'

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
