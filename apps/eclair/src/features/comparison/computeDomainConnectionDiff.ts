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

type EdgeType = 'sync' | 'async' | 'unknown'

function parseEdgeType(type: string): EdgeType {
  if (type === 'async') return 'async'
  if (type === 'sync') return 'sync'
  return 'unknown'
}

function createNewAggregation(
  sourceInfo: NodeInfo,
  targetInfo: NodeInfo,
  edgeDetail: EdgeDetail
): ConnectionAggregation {
  return {
    source: sourceInfo.domain,
    target: targetInfo.domain,
    apiCount: targetInfo.type === 'API' ? 1 : 0,
    eventCount: targetInfo.type === 'EventHandler' ? 1 : 0,
    edges: [edgeDetail],
  }
}

function updateExistingAggregation(
  existing: ConnectionAggregation,
  targetType: NodeType,
  edgeDetail: EdgeDetail
): void {
  if (targetType === 'API') existing.apiCount += 1
  if (targetType === 'EventHandler') existing.eventCount += 1
  existing.edges.push(edgeDetail)
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
    const edgeDetail: EdgeDetail = {
      sourceNodeName: sourceInfo.name,
      targetNodeName: targetInfo.name,
      type: parseEdgeType(edge.type),
    }

    const existing = aggregation.get(key)
    if (existing === undefined) {
      aggregation.set(key, createNewAggregation(sourceInfo, targetInfo, edgeDetail))
    } else {
      updateExistingAggregation(existing, targetInfo.type, edgeDetail)
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
