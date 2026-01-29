import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  getEdgeType,
  recordEdgeAggregation,
  type ConnectionDetail,
  type EdgeAggregation,
} from './edgeAggregation'

export function aggregateDomainEdges(
  links: RiviereGraph['links'],
  nodeInfo: Map<
    string,
    {
      domain: string
      name: string
      type: string
    }
  >,
  edgeAggregation: Map<string, EdgeAggregation>,
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

    recordEdgeAggregation(
      edgeAggregation,
      key,
      sourceInfo,
      targetInfo,
      connection,
      isApi,
      isEventHandler,
    )
  }
}
