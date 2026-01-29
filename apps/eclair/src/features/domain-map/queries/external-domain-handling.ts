import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  getEdgeType, type ConnectionDetail 
} from './edgeAggregation'

export interface ExternalEdgeInfo {
  targetName: string
  sourceDomain: string
  connectionCount: number
  connections: ConnectionDetail[]
}

export function aggregateExternalEdges(
  graph: RiviereGraph,
  nodeInfo: Map<
    string,
    {
      domain: string
      name: string
      type: string
    }
  >,
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

export function createExternalNodeId(name: string): string {
  return `external:${name}`
}
