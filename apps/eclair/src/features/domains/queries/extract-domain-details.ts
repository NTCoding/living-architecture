import type { RiviereGraph, SystemType, SourceLocation } from '@living-architecture/riviere-schema'
import {
  nodeIdSchema,
  type DomainName,
  type EdgeType,
  type EntryPoint,
  type NodeId,
} from '@/platform/domain/eclair-types'
import { RiviereQuery, type Entity } from '@living-architecture/riviere-query'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'
import type { NodeBreakdown, DomainNode } from './domain-node-breakdown'
import { countNodesByType, formatDomainNodes, extractEntryPoints } from './domain-node-breakdown'
import type { DomainEvent } from '@/platform/domain/domain-event-types'

export interface AggregatedConnection {
  targetDomain: string
  direction: 'incoming' | 'outgoing'
  apiCount: number
  eventCount: number
  relationshipCount: number
  relationshipTypes?: string[]
  deliveryTypes?: EdgeType[]
  conditions?: string[]
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
  relationshipType?: string
  condition?: string
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

    const key = JSON.stringify([targetDomain, edge.relationshipType, edge.type, edge.condition])
    if (crossDomainEdgeSet.has(key)) continue

    crossDomainEdgeSet.add(key)
    const crossDomainEdge: CrossDomainEdge = {
      targetDomain,
      edgeType: edge.type,
    }
    if (edge.relationshipType !== undefined) {
      crossDomainEdge.relationshipType = edge.relationshipType
    }
    if (edge.condition !== undefined) {
      crossDomainEdge.condition = edge.condition
    }
    crossDomainEdges.push(crossDomainEdge)
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
  const nodes = formatDomainNodes(domainNodes, graph.metadata.customTypes)
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
  const aggregatedConnections = buildAggregatedConnections(graph, domainId)
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

function buildAggregatedConnections(graph: RiviereGraph, domainId: string): AggregatedConnection[] {
  const componentById = new Map(graph.components.map((component) => [component.id, component]))
  const connections = new Map<string, AggregatedConnection>()

  for (const link of graph.links) {
    const source = componentById.get(link.source)
    const target = componentById.get(link.target)
    if (source === undefined || target === undefined || source.domain === target.domain) continue

    const isOutgoing = source.domain === domainId
    const isIncoming = target.domain === domainId
    if (!isOutgoing && !isIncoming) continue

    const direction = isOutgoing ? 'outgoing' : 'incoming'
    const targetDomain = isOutgoing ? target.domain : source.domain
    const key = `${direction}:${targetDomain}`
    const existing = connections.get(key) ?? {
      targetDomain,
      direction,
      apiCount: 0,
      eventCount: 0,
      relationshipCount: 0,
    }

    updateAggregatedConnection(existing, link, target)
    connections.set(key, existing)
  }

  return [...connections.values()].sort((left, right) => {
    const domainOrder = compareByCodePoint(left.targetDomain, right.targetDomain)
    if (domainOrder !== 0) return domainOrder
    return compareByCodePoint(left.direction, right.direction)
  })
}

function appendUnique<T>(values: T[] | undefined, value: T | undefined): T[] | undefined {
  if (value === undefined) return values
  const currentValues = values ?? []
  return currentValues.includes(value) ? currentValues : [...currentValues, value]
}

function updateAggregatedConnection(
  connection: AggregatedConnection,
  link: RiviereGraph['links'][number],
  target: RiviereGraph['components'][number],
): void {
  connection.relationshipCount += 1
  const relationshipTypes = appendUnique(connection.relationshipTypes, link.relationshipType)
  if (relationshipTypes !== undefined) connection.relationshipTypes = relationshipTypes
  const deliveryTypes = appendUnique(connection.deliveryTypes, link.type)
  if (deliveryTypes !== undefined) connection.deliveryTypes = deliveryTypes
  const conditions = appendUnique(connection.conditions, link.condition)
  if (conditions !== undefined) connection.conditions = conditions
  if (target.type === 'API') connection.apiCount += 1
  if (target.type === 'EventHandler') connection.eventCount += 1
}
