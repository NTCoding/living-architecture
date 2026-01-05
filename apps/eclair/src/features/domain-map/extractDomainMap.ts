import type { RiviereGraph } from '@/types/riviere'
import type {
  Node, Edge 
} from '@xyflow/react'
import dagre from 'dagre'
import { getClosestHandle } from '@/lib/handlePositioning'
import { RiviereQuery } from '@living-architecture/riviere-query'

const LABEL_BG_PADDING: [number, number] = [4, 6]
// All domain nodes use consistent sizing for visual clarity
const DOMAIN_NODE_SIZE = 120
const EXTERNAL_NODE_SIZE = 100

function formatEdgeLabel(apiCount: number, eventCount: number): string | undefined {
  if (apiCount > 0 && eventCount > 0) {
    return `${apiCount} API · ${eventCount} Event`
  }
  if (apiCount > 0) {
    return `${apiCount} API`
  }
  if (eventCount > 0) {
    return `${eventCount} Event`
  }
  return undefined
}

export interface DomainNodeData {
  label: string
  nodeCount: number
  calculatedSize?: number
  dimmed?: boolean
  isExternal?: boolean
}

export interface ConnectionDetail {
  sourceName: string
  targetName: string
  type: 'sync' | 'async' | 'unknown'
  targetNodeType: string
}

export interface DomainEdgeData {
  apiCount: number
  eventCount: number
  connections: ConnectionDetail[]
}

export type DomainNode = Node<DomainNodeData, 'domain'>
export type DomainEdge = Edge<DomainEdgeData>

interface DomainMapData {
  domainNodes: DomainNode[]
  domainEdges: DomainEdge[]
}

interface LayoutInput {
  domainIds: string[]
  edges: Array<{
    source: string;
    target: string 
  }>
  nodeSizes: Map<string, number>
}

interface EdgeAggregation {
  source: string
  target: string
  apiCount: number
  eventCount: number
  connections: ConnectionDetail[]
}

function recordEdgeAggregation(
  aggregation: Map<string, EdgeAggregation>,
  key: string,
  sourceInfo: {
    domain: string;
    name: string;
    type: string 
  },
  targetInfo: {
    domain: string;
    name: string;
    type: string 
  },
  connection: ConnectionDetail,
  isApi: boolean,
  isEventHandler: boolean
): void {
  const existing = aggregation.get(key)
  if (existing === undefined) {
    aggregation.set(key, {
      source: sourceInfo.domain,
      target: targetInfo.domain,
      apiCount: isApi ? 1 : 0,
      eventCount: isEventHandler ? 1 : 0,
      connections: [connection],
    })
    return
  }

  if (isApi) {
    existing.apiCount += 1
  }
  if (isEventHandler) {
    existing.eventCount += 1
  }
  existing.connections.push(connection)
}

function getEdgeType(type: string | undefined): 'sync' | 'async' | 'unknown' {
  if (type === 'sync') return 'sync'
  if (type === 'async') return 'async'
  return 'unknown'
}

function aggregateDomainEdges(
  links: RiviereGraph['links'],
  nodeInfo: Map<string, {
    domain: string;
    name: string;
    type: string 
  }>,
  edgeAggregation: Map<string, EdgeAggregation>
): void {
  for (const edge of links) {
    const sourceInfo = nodeInfo.get(edge.source)
    const targetInfo = nodeInfo.get(edge.target)
    if (sourceInfo === undefined || targetInfo === undefined) continue
    if (sourceInfo.domain === targetInfo.domain) continue

    const isApi = targetInfo.type === 'API'
    const isEventHandler = targetInfo.type === 'EventHandler'
    const key = `${sourceInfo.domain}->${targetInfo.domain}`
    const connection: ConnectionDetail = {
      sourceName: sourceInfo.name,
      targetName: targetInfo.name,
      type: getEdgeType(edge.type),
      targetNodeType: targetInfo.type,
    }

    recordEdgeAggregation(edgeAggregation, key, sourceInfo, targetInfo, connection, isApi, isEventHandler)
  }
}

interface ExternalEdgeInfo {
  targetName: string
  sourceDomain: string
  connectionCount: number
  connections: ConnectionDetail[]
}

function aggregateExternalEdges(
  graph: RiviereGraph,
  nodeInfo: Map<string, {
    domain: string;
    name: string;
    type: string 
  }>
): ExternalEdgeInfo[] {
  if (graph.externalLinks === undefined) return []

  const edgeMap = new Map<string, ExternalEdgeInfo>()

  for (const extLink of graph.externalLinks) {
    const sourceInfo = nodeInfo.get(extLink.source)
    if (sourceInfo === undefined) continue

    const key = `${sourceInfo.domain}->${extLink.target.name}`
    const existing = edgeMap.get(key)

    const connection: ConnectionDetail = {
      sourceName: sourceInfo.name,
      targetName: extLink.target.name,
      type: getEdgeType(extLink.type),
      targetNodeType: 'External',
    }

    if (existing === undefined) {
      edgeMap.set(key, {
        targetName: extLink.target.name,
        sourceDomain: sourceInfo.domain,
        connectionCount: 1,
        connections: [connection],
      })
    } else {
      existing.connectionCount += 1
      existing.connections.push(connection)
    }
  }

  return Array.from(edgeMap.values())
}

function computeDagreLayout(input: LayoutInput): Map<string, {
  x: number;
  y: number 
}> {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

  g.setGraph({
    rankdir: 'LR',
    nodesep: 40,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  })

  for (const domainId of input.domainIds) {
    const size = input.nodeSizes.get(domainId)
    if (size === undefined) {
      throw new Error(`Domain ${domainId} missing from nodeSizes`)
    }
    g.setNode(domainId, {
      width: size,
      height: size 
    })
  }

  for (const edge of input.edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const positions = new Map<string, {
    x: number;
    y: number 
  }>()
  for (const domainId of input.domainIds) {
    const node = g.node(domainId)
    positions.set(domainId, {
      x: node.x,
      y: node.y 
    })
  }

  return positions
}

function createExternalNodeId(name: string): string {
  return `external:${name}`
}

export function extractDomainMap(graph: RiviereGraph): DomainMapData {
  const query = new RiviereQuery(graph)
  const externalDomains = query.externalDomains()

  const domainCounts = new Map<string, number>()
  for (const node of graph.components) {
    const currentCount = domainCounts.get(node.domain)
    const count = currentCount === undefined ? 0 : currentCount
    domainCounts.set(node.domain, count + 1)
  }

  const nodeInfo = new Map<string, {
    domain: string;
    name: string;
    type: string 
  }>()
  for (const node of graph.components) {
    nodeInfo.set(node.id, {
      domain: node.domain,
      name: node.name,
      type: node.type 
    })
  }

  const edgeAggregation = new Map<string, EdgeAggregation>()
  aggregateDomainEdges(graph.links, nodeInfo, edgeAggregation)

  const externalEdges = aggregateExternalEdges(graph, nodeInfo)

  const domains = Array.from(domainCounts.entries())
  const externalNodeIds = externalDomains.map((ed) => createExternalNodeId(ed.name))
  const allNodeIds = [...domains.map(([domain]) => domain), ...externalNodeIds]

  const layoutEdges = [
    ...Array.from(edgeAggregation.values()).map((agg) => ({
      source: agg.source,
      target: agg.target,
    })),
    ...externalEdges.map((e) => ({
      source: e.sourceDomain,
      target: createExternalNodeId(e.targetName),
    })),
  ]

  // All domain nodes use consistent sizing for visual clarity
  const nodeSizes = new Map<string, number>()
  for (const [domain] of domains) {
    nodeSizes.set(domain, DOMAIN_NODE_SIZE)
  }
  for (const ed of externalDomains) {
    nodeSizes.set(createExternalNodeId(ed.name), EXTERNAL_NODE_SIZE)
  }

  const domainPositions = computeDagreLayout({
    domainIds: allNodeIds,
    edges: layoutEdges,
    nodeSizes 
  })

  const domainNodes: DomainNode[] = domains.map(([domain, nodeCount]) => {
    const position = domainPositions.get(domain)
    if (position === undefined) {
      throw new Error(`Domain ${domain} missing from layout computation`)
    }
    const calculatedSize = nodeSizes.get(domain)
    return {
      id: domain,
      type: 'domain',
      position,
      data: {
        label: domain,
        nodeCount,
        calculatedSize,
        isExternal: false 
      },
    }
  })

  const externalNodes: DomainNode[] = externalDomains.map((ed) => {
    const nodeId = createExternalNodeId(ed.name)
    const position = domainPositions.get(nodeId)
    if (position === undefined) {
      throw new Error(`External domain ${ed.name} missing from layout computation`)
    }
    const calculatedSize = nodeSizes.get(nodeId)
    return {
      id: nodeId,
      type: 'domain',
      position,
      data: {
        label: ed.name,
        nodeCount: ed.connectionCount,
        calculatedSize,
        isExternal: true 
      },
    }
  })

  const allNodes = [...domainNodes, ...externalNodes]

  const domainEdges: DomainEdge[] = Array.from(edgeAggregation.entries()).map(([key, agg]) => {
    const sourcePos = domainPositions.get(agg.source)
    const targetPos = domainPositions.get(agg.target)
    if (sourcePos === undefined || targetPos === undefined) {
      throw new Error(`Edge references missing domain position: source=${agg.source} target=${agg.target}`)
    }
    const handles = getClosestHandle(sourcePos, targetPos)

    const isEventOnly = agg.eventCount > 0 && agg.apiCount === 0
    const strokeColor = isEventOnly ? '#F59E0B' : '#06B6D4'
    const arrowMarker = isEventOnly ? 'url(#arrow-amber)' : 'url(#arrow-cyan)'

    return {
      id: key,
      source: agg.source,
      target: agg.target,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      label: formatEdgeLabel(agg.apiCount, agg.eventCount),
      data: {
        apiCount: agg.apiCount,
        eventCount: agg.eventCount,
        connections: agg.connections 
      },
      style: { stroke: strokeColor },
      labelStyle: {
        fontSize: 10,
        fontWeight: 600,
        fill: '#1f2937' 
      },
      labelBgStyle: {
        fill: 'rgba(255, 255, 255, 0.85)',
        stroke: 'rgba(0, 0, 0, 0.1)',
        strokeWidth: 1,
        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' 
      },
      labelBgPadding: LABEL_BG_PADDING,
      labelBgBorderRadius: 4,
      markerEnd: arrowMarker,
    }
  })

  const externalEdgesForMap: DomainEdge[] = externalEdges.map((e) => {
    const targetId = createExternalNodeId(e.targetName)
    const sourcePos = domainPositions.get(e.sourceDomain)
    const targetPos = domainPositions.get(targetId)
    if (sourcePos === undefined || targetPos === undefined) {
      throw new Error(`External edge missing position: source=${e.sourceDomain} target=${targetId}`)
    }
    const handles = getClosestHandle(sourcePos, targetPos)

    return {
      id: `${e.sourceDomain}->${targetId}`,
      source: e.sourceDomain,
      target: targetId,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      label: `${e.connectionCount} API`,
      data: {
        apiCount: e.connectionCount,
        eventCount: 0,
        connections: e.connections 
      },
      style: {
        stroke: '#F97316',
        strokeDasharray: '5,5' 
      },
      labelStyle: {
        fontSize: 10,
        fontWeight: 600,
        fill: '#1f2937' 
      },
      labelBgStyle: {
        fill: 'rgba(255, 255, 255, 0.85)',
        stroke: 'rgba(0, 0, 0, 0.1)',
        strokeWidth: 1,
        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' 
      },
      labelBgPadding: LABEL_BG_PADDING,
      labelBgBorderRadius: 4,
      markerEnd: 'url(#arrow-orange)',
    }
  })

  return {
    domainNodes: allNodes,
    domainEdges: [...domainEdges, ...externalEdgesForMap] 
  }
}

export function getConnectedDomains(domain: string, edges: DomainEdge[]): Set<string> {
  const connected = new Set<string>()
  for (const edge of edges) {
    if (edge.source === domain) {
      connected.add(edge.target)
    }
    if (edge.target === domain) {
      connected.add(edge.source)
    }
  }
  return connected
}
