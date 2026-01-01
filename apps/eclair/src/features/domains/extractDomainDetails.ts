import type {
  RiviereGraph,
  DomainName,
  NodeType,
  SystemType,
  EdgeType,
  SourceLocation,
  EntryPoint,
  NodeId,
} from '@/types/riviere'
import { nodeIdSchema } from '@/types/riviere'
import { RiviereQuery, type Entity } from '@living-architecture/riviere-query'
import type { NodeBreakdown } from './domainNodeBreakdown'
export type { NodeBreakdown } from './domainNodeBreakdown'
import { countNodesByType, formatDomainNodes, extractEntryPoints } from './domainNodeBreakdown'

export interface DomainNode {
  id: string
  type: NodeType
  name: string
  location: string | undefined
  sourceLocation: SourceLocation | undefined
}

export interface AggregatedConnection {
  targetDomain: string
  direction: 'incoming' | 'outgoing'
  apiCount: number
  eventCount: number
}

export interface EventSubscriber {
  domain: string
  handlerName: string
}

export interface DomainEvent {
  id: string
  eventName: string
  schema: string | undefined
  sourceLocation: SourceLocation | undefined
  handlers: EventSubscriber[]
}

export interface KnownSourceEventInfo {
  eventName: string
  sourceDomain: string
  sourceKnown: true
}

export interface UnknownSourceEventInfo {
  eventName: string
  sourceKnown: false
}

export type SubscribedEventInfo = KnownSourceEventInfo | UnknownSourceEventInfo

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

export type DomainDetailsType = DomainDetails | null

function buildCrossDomainEdges(
  graph: RiviereGraph,
  domainId: DomainName
): CrossDomainEdge[] {
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

  return crossDomainEdges.sort((a, b) => a.targetDomain.localeCompare(b.targetDomain))
}

export function extractDomainDetails(graph: RiviereGraph, domainId: DomainName): DomainDetails | null {
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
    graph.components.map((c) => [c.id, c])
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
    const description = component?.description !== undefined && typeof component?.description === 'string'
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
    published: publishedEvents.toSorted((a: DomainEvent, b: DomainEvent) => a.eventName.localeCompare(b.eventName)),
    consumed: consumedHandlers.toSorted((a: DomainEventHandler, b: DomainEventHandler) => a.handlerName.localeCompare(b.handlerName)),
  }

  const crossDomainEdges = buildCrossDomainEdges(graph, domainId)
  const aggregatedConnections = query.domainConnections(domainId)
  const entryPoints = extractEntryPoints(domainNodes)

  const repository = domainNodes
    .find((node) => node.sourceLocation?.repository)
    ?.sourceLocation?.repository

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
