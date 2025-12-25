import type { RiviereGraph, Node, NodeType } from '@/types/riviere'

export interface EdgeDetail {
  sourceNodeName: string
  targetNodeName: string
  type: 'sync' | 'async' | 'unknown'
}

export interface DomainConnection {
  source: string
  target: string
  apiCount: number
  eventCount: number
  edges: EdgeDetail[]
}

export interface DomainConnectionDiffResult {
  domains: string[]
  connections: {
    added: DomainConnection[]
    removed: DomainConnection[]
    unchanged: DomainConnection[]
  }
}

interface NodeInfo {
  domain: string
  name: string
  type: NodeType
}

function buildNodeInfoMap(nodes: Node[]): Map<string, NodeInfo> {
  const map = new Map<string, NodeInfo>()
  for (const node of nodes) {
    map.set(node.id, { domain: node.domain, name: node.name, type: node.type })
  }
  return map
}

function extractDomains(graph: RiviereGraph): Set<string> {
  const domains = new Set<string>()
  for (const node of graph.components) {
    domains.add(node.domain)
  }
  return domains
}

function createConnectionKey(source: string, target: string): string {
  return `${source}->${target}`
}

interface ConnectionAggregation {
  source: string
  target: string
  apiCount: number
  eventCount: number
  edges: EdgeDetail[]
}

function aggregateDomainConnections(graph: RiviereGraph): Map<string, ConnectionAggregation> {
  const nodeInfo = buildNodeInfoMap(graph.components)
  const aggregation = new Map<string, ConnectionAggregation>()

  for (const edge of graph.links) {
    const sourceInfo = nodeInfo.get(edge.source)
    const targetInfo = nodeInfo.get(edge.target)
    if (sourceInfo === undefined || targetInfo === undefined) continue
    if (sourceInfo.domain === targetInfo.domain) continue

    const key = createConnectionKey(sourceInfo.domain, targetInfo.domain)
    const existing = aggregation.get(key)
    const isApi = targetInfo.type === 'API'
    const isEventHandler = targetInfo.type === 'EventHandler'
    const edgeType: 'sync' | 'async' | 'unknown' =
      edge.type === 'async' ? 'async' : edge.type === 'sync' ? 'sync' : 'unknown'
    const edgeDetail: EdgeDetail = {
      sourceNodeName: sourceInfo.name,
      targetNodeName: targetInfo.name,
      type: edgeType,
    }

    if (existing === undefined) {
      aggregation.set(key, {
        source: sourceInfo.domain,
        target: targetInfo.domain,
        apiCount: isApi ? 1 : 0,
        eventCount: isEventHandler ? 1 : 0,
        edges: [edgeDetail],
      })
    } else {
      if (isApi) {
        existing.apiCount += 1
      }
      if (isEventHandler) {
        existing.eventCount += 1
      }
      existing.edges.push(edgeDetail)
    }
  }

  return aggregation
}

export function computeDomainConnectionDiff(
  before: RiviereGraph,
  after: RiviereGraph
): DomainConnectionDiffResult {
  const beforeDomains = extractDomains(before)
  const afterDomains = extractDomains(after)
  const allDomains = new Set([...beforeDomains, ...afterDomains])

  const beforeConnections = aggregateDomainConnections(before)
  const afterConnections = aggregateDomainConnections(after)

  const added: DomainConnection[] = []
  const removed: DomainConnection[] = []
  const unchanged: DomainConnection[] = []

  for (const [key, connection] of afterConnections) {
    if (!beforeConnections.has(key)) {
      added.push(connection)
    } else {
      unchanged.push(connection)
    }
  }

  for (const [key, connection] of beforeConnections) {
    if (!afterConnections.has(key)) {
      removed.push(connection)
    }
  }

  return {
    domains: Array.from(allDomains),
    connections: { added, removed, unchanged },
  }
}
