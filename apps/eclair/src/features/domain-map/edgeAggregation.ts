export interface ConnectionDetail {
  sourceName: string
  targetName: string
  type: 'sync' | 'async' | 'unknown'
  targetNodeType: string
}

export function formatEdgeLabel(apiCount: number, eventCount: number): string | undefined {
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

export function getEdgeType(type: string | undefined): 'sync' | 'async' | 'unknown' {
  if (type === 'sync') return 'sync'
  if (type === 'async') return 'async'
  return 'unknown'
}

export interface EdgeAggregation {
  source: string
  target: string
  apiCount: number
  eventCount: number
  connections: ConnectionDetail[]
}

export function recordEdgeAggregation(
  aggregation: Map<string, EdgeAggregation>,
  key: string,
  sourceInfo: {
    domain: string
    name: string
    type: string
  },
  targetInfo: {
    domain: string
    name: string
    type: string
  },
  connection: ConnectionDetail,
  isApi: boolean,
  isEventHandler: boolean,
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
