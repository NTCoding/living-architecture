import type {
  RiviereGraph, SystemType, SourceLocation 
} from '@living-architecture/riviere-schema'
import {
  nodeIdSchema,
  type DomainName,
  type EdgeType,
  type EntryPoint,
  type NodeId,
} from '@/platform/domain/eclair-types'
import {
  RiviereQuery, type Entity 
} from '@living-architecture/riviere-query'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'
import type {
  NodeBreakdown, DomainNode 
} from './domain-node-breakdown'
import {
  countNodesByType, formatDomainNodes, extractEntryPoints 
} from './domain-node-breakdown'
import type { DomainEvent } from '@/platform/domain/domain-event-types'

export interface AggregatedConnection {
  targetDomain: string
  direction: 'incoming' | 'outgoing'
  apiCount: number
  eventCount: number
}

interface KnownSourceEventInfo {
  eventName: string
  sourceDomain: string
  sourceKnown: true
}

interface UnknownSourceEventInfo {
  eventName: string
  sourceKnown: false
}

type SubscribedEventInfo = KnownSourceEventInfo | UnknownSourceEventInfo

export interface DomainEventHandler {
  id: string
  handlerName: string
  description: string | undefined
  subscribedEvents: string[]
  subscribedEventsWithDomain: SubscribedEventInfo[]
  sourceLocation: SourceLocation | undefined
}

export interface DomainEvents {
  published: DomainEvent[]
  consumed: DomainEventHandler[]
}

export interface CrossDomainEdge {
  targetDomain: string
  edgeType: EdgeType | undefined
}

export interface DomainDetails {
  id: string
  description: string
  systemType: SystemType
  nodeBreakdown: NodeBreakdown
  nodes: DomainNode[]
  entities: Entity[]
  events: DomainEvents
  crossDomainEdges: CrossDomainEdge[]
  aggregatedConnections: AggregatedConnection[]
  entryPoints: EntryPoint[]
  repository: string | undefined
}

function buildCrossDomainEdges(graph: RiviereGraph, domainId: DomainName): CrossDomainEdge[] {
  const nodeIdToDomain = new Map<string, string>()
  for (const node of graph.components) {
    nodeIdToDomain.set(node.id, node.domain)
  }

  const crossDomainEdgeSet = new Set<string>()
  const crossDomainEdges: CrossDomainEdge[] = []

  for (const edge of graph.links) {
    const sourceDomain = nodeIdToDomain.get(edge.source)
    const targetDomain = nodeIdToDomain.get(edge.target)

    if (sourceDomain !== domainId || targetDomain === domainId || targetDomain === undefined) {
      continue
    }

    const key = `${targetDomain}:${edge.type ?? 'unknown'}`
    if (crossDomainEdgeSet.has(key)) continue

    crossDomainEdgeSet.add(key)
    crossDomainEdges.push({
      targetDomain,
      edgeType: edge.type,
    })
  }

  return crossDomainEdges.sort((a, b) => compareByCodePoint(a.targetDomain, b.targetDomain))
}

export function extractDomainDetails(
  graph: RiviereGraph,
  domainId: DomainName,
): DomainDetails | null {
  const domainMeta = graph.metadata.domains[domainId]
  if (domainMeta === undefined) {
    return null
  }

  const query = new RiviereQuery(graph)
  const domainNodes = graph.components.filter((n) => n.domain === domainId)

  const breakdown = countNodesByType(domainNodes)
  const nodes = formatDomainNodes(domainNodes)
  const entities = query.entities(domainId)

  const queryPublished = query.publishedEvents(domainId)
  const queryHandlers = query.eventHandlers()
  const componentById = new Map<NodeId, RiviereGraph['components'][number]>(
    graph.components.map((c) => [c.id, c]),
  )

  const publishedEvents: DomainEvent[] = queryPublished.map((pe) => {
    const nodeId = nodeIdSchema.parse(pe.id)
    const component = componentById.get(nodeId)
    const schema = component?.type === 'Event' ? component.eventSchema : undefined
    return {
      id: pe.id,
      eventName: pe.eventName,
      sourceLocation: component?.sourceLocation,
      handlers: pe.handlers,
      schema,
    }
  })

  const domainHandlers = queryHandlers.filter((h) => h.domain === domainId)
  const consumedHandlers: DomainEventHandler[] = domainHandlers.map((h) => {
    const nodeId = nodeIdSchema.parse(h.id)
    const component = componentById.get(nodeId)
    const description =
      component?.description !== undefined && typeof component?.description === 'string'
        ? component.description
        : undefined
    return {
      id: h.id,
      handlerName: h.handlerName,
      description,
      sourceLocation: component?.sourceLocation,
      subscribedEvents: h.subscribedEvents,
      subscribedEventsWithDomain: h.subscribedEventsWithDomain,
    }
  })

  const events: DomainEvents = {
    published: publishedEvents.toSorted((a: DomainEvent, b: DomainEvent) =>
      compareByCodePoint(a.eventName, b.eventName),
    ),
    consumed: consumedHandlers.toSorted((a: DomainEventHandler, b: DomainEventHandler) =>
      compareByCodePoint(a.handlerName, b.handlerName),
    ),
  }

  const crossDomainEdges = buildCrossDomainEdges(graph, domainId)
  const aggregatedConnections = query.domainConnections(domainId)
  const entryPoints = extractEntryPoints(domainNodes)

  const repository = domainNodes.find((node) => node.sourceLocation?.repository)?.sourceLocation
    ?.repository

  return {
    id: domainId,
    description: domainMeta.description,
    systemType: domainMeta.systemType,
    nodeBreakdown: breakdown,
    nodes,
    entities,
    events,
    crossDomainEdges,
    aggregatedConnections,
    entryPoints,
    repository,
  }
}
