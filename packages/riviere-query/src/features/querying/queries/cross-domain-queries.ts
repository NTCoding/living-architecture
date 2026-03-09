import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type {
  CrossDomainLink, DomainConnection 
} from './domain-types'
import { parseDomainName } from './domain-types'
import { compareByCodePoint } from './compare-by-code-point'

/** @riviere-role query-service */
function buildNodeIdToDomain(graph: RiviereGraph): Map<string, string> {
  return new Map(graph.components.map((c) => [c.id, c.domain]))
}

/** @riviere-role query-service */
export function queryCrossDomainLinks(graph: RiviereGraph, domainName: string): CrossDomainLink[] {
  const nodeIdToDomain = buildNodeIdToDomain(graph)
  const seen = new Set<string>()
  const results: CrossDomainLink[] = []

  for (const link of graph.links) {
    const sourceDomain = nodeIdToDomain.get(link.source)
    const targetDomain = nodeIdToDomain.get(link.target)

    if (sourceDomain !== domainName || targetDomain === domainName) {
      continue
    }

    if (targetDomain === undefined) {
      continue
    }

    const linkTypeKey = link.type ?? 'UNDEFINED_LINK_TYPE'
    const key = `${targetDomain}:${linkTypeKey}`
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    results.push({
      targetDomain: parseDomainName(targetDomain),
      linkType: link.type,
    })
  }

  return results.sort(compareCrossDomainLinks)
}

const UNDEFINED_LINK_TYPE_SORT_KEY = ''

/** @riviere-role query-service */
function linkTypeForSort(linkType: 'sync' | 'async' | undefined): string {
  if (linkType === undefined) return UNDEFINED_LINK_TYPE_SORT_KEY
  return linkType
}

/** @riviere-role query-service */
function compareCrossDomainLinks(a: CrossDomainLink, b: CrossDomainLink): number {
  const domainCompare = compareByCodePoint(a.targetDomain, b.targetDomain)
  if (domainCompare !== 0) return domainCompare
  return compareByCodePoint(linkTypeForSort(a.linkType), linkTypeForSort(b.linkType))
}

interface ConnectionCounts {
  apiCount: number
  eventCount: number
}

/** @riviere-role query-service */
function initializeConnectionCounts(): ConnectionCounts {
  return {
    apiCount: 0,
    eventCount: 0,
  }
}

/** @riviere-role query-service */
function getOrInitializeConnectionCounts(
  map: Map<string, ConnectionCounts>,
  domain: string,
): ConnectionCounts {
  const existing = map.get(domain)
  if (existing !== undefined) {
    return existing
  }
  const counts = initializeConnectionCounts()
  map.set(domain, counts)
  return counts
}

/** @riviere-role query-service */
function incrementConnectionCount(
  map: Map<string, ConnectionCounts>,
  domain: string,
  targetType: string | undefined,
): void {
  const counts = getOrInitializeConnectionCounts(map, domain)
  if (targetType === 'API') counts.apiCount++
  if (targetType === 'EventHandler') counts.eventCount++
}

/** @riviere-role query-service */
function collectConnections(
  graph: RiviereGraph,
  domainName: string,
  nodeIdToDomain: Map<string, string>,
  nodeById: Map<string, { type: string }>,
): {
  outgoing: Map<string, ConnectionCounts>
  incoming: Map<string, ConnectionCounts>
} {
  const outgoing = new Map<string, ConnectionCounts>()
  const incoming = new Map<string, ConnectionCounts>()

  for (const link of graph.links) {
    const sourceDomain = nodeIdToDomain.get(link.source)
    const targetDomain = nodeIdToDomain.get(link.target)
    const targetType = nodeById.get(link.target)?.type

    if (sourceDomain === domainName && targetDomain !== undefined && targetDomain !== domainName) {
      incrementConnectionCount(outgoing, targetDomain, targetType)
    }

    if (targetDomain === domainName && sourceDomain !== undefined && sourceDomain !== domainName) {
      incrementConnectionCount(incoming, sourceDomain, targetType)
    }
  }

  return {
    outgoing,
    incoming,
  }
}

/** @riviere-role query-service */
function toConnectionResults(
  connections: Map<string, ConnectionCounts>,
  direction: 'outgoing' | 'incoming',
): DomainConnection[] {
  return Array.from(connections.entries()).map(([domain, counts]) => ({
    targetDomain: parseDomainName(domain),
    direction,
    apiCount: counts.apiCount,
    eventCount: counts.eventCount,
  }))
}

/** @riviere-role query-service */
export function queryDomainConnections(
  graph: RiviereGraph,
  domainName: string,
): DomainConnection[] {
  const nodeIdToDomain = buildNodeIdToDomain(graph)
  const nodeById = new Map(graph.components.map((c) => [c.id, { type: c.type }]))
  const {
    outgoing, incoming 
  } = collectConnections(graph, domainName, nodeIdToDomain, nodeById)

  const results = [
    ...toConnectionResults(outgoing, 'outgoing'),
    ...toConnectionResults(incoming, 'incoming'),
  ]
  return results.sort((a, b) => compareByCodePoint(a.targetDomain, b.targetDomain))
}
