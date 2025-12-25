import type {
  RiviereGraph,
  DomainName,
  NodeType,
  SystemType,
  EdgeType,
  OperationBehavior,
  OperationSignature,
  StateTransition,
  SourceLocation,
  OperationName,
  StateName,
  Invariant,
  EntryPoint,
  NodeId,
} from '@/types/riviere'
import { InvariantSchema, NodeIdSchema } from '@/types/riviere'
import { RiviereQuery } from '@living-architecture/riviere-query'
import type { NodeBreakdown } from './domainNodeBreakdown'
export type { NodeBreakdown } from './domainNodeBreakdown'
import { extractEntities, countNodesByType, formatDomainNodes, extractEntryPoints } from './domainNodeBreakdown'

export interface DomainNode {
  id: string
  type: NodeType
  name: string
  location: string | undefined
  sourceLocation: SourceLocation | undefined
}

export interface OperationDetail {
  id: string
  operationName: OperationName
  name: string
  behavior: OperationBehavior | undefined
  stateChanges: StateTransition[] | undefined
  signature: OperationSignature | undefined
  sourceLocation: SourceLocation | undefined
}

export interface DomainEntity {
  name: string
  description: string | undefined
  operations: OperationName[]
  operationDetails: OperationDetail[]
  allStates: StateName[]
  invariants: Invariant[]
  sourceLocation: SourceLocation | undefined
}

export function hasStates(entity: DomainEntity): boolean {
  return entity.allStates.length > 0
}

export function hasInvariants(entity: DomainEntity): boolean {
  return entity.invariants.length > 0
}

export function hasStateChanges(
  operation: OperationDetail
): operation is OperationDetail & { stateChanges: StateTransition[] } {
  return operation.stateChanges !== undefined && operation.stateChanges.length > 0
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
  schema: Record<string, unknown> | undefined
  sourceLocation: SourceLocation | undefined
  handlers: EventSubscriber[]
}

export interface SubscribedEventInfo {
  eventName: string
  sourceDomain: string | undefined
}

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
  entities: DomainEntity[]
  events: DomainEvents
  crossDomainEdges: CrossDomainEdge[]
  aggregatedConnections: AggregatedConnection[]
  entryPoints: EntryPoint[]
  repository: string | undefined
}

export type DomainDetailsType = DomainDetails | null

function mergeEntityMetadata(
  entities: DomainEntity[],
  domainMeta: NonNullable<RiviereGraph['metadata']['domains'][string]>
): DomainEntity[] {
  const entityMetadata = domainMeta.entities ?? {}

  return entities.map((entity) => {
    const metadata = entityMetadata[entity.name]
    if (metadata === undefined) {
      return entity
    }

    return {
      ...entity,
      description: metadata.description,
      invariants: (metadata.invariants ?? []).map((inv: string) => InvariantSchema.parse(inv)),
    }
  })
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validateEventSchema(schema: unknown): Record<string, unknown> | undefined {
  if (typeof schema === 'string') return undefined
  if (isObjectRecord(schema)) return schema
  return undefined
}

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
  const extractedEntities = extractEntities(domainNodes)
  const entities = mergeEntityMetadata(extractedEntities, domainMeta)

  const queryPublished = query.publishedEvents(domainId)
  const queryHandlers = query.eventHandlers()
  const componentById = new Map<NodeId, RiviereGraph['components'][number]>(
    graph.components.map((c) => [c.id, c])
  )

  const publishedEvents: DomainEvent[] = queryPublished.map((pe) => {
    const nodeId = NodeIdSchema.parse(pe.id)
    const component = componentById.get(nodeId)
    const schema = component?.metadata !== undefined && component.metadata['schema'] !== undefined
      ? validateEventSchema(component.metadata['schema'])
      : undefined
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
    const nodeId = NodeIdSchema.parse(h.id)
    const component = componentById.get(nodeId)
    const description = component?.description !== null && typeof component?.description === 'string'
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
    published: publishedEvents.sort((a, b) => a.eventName.localeCompare(b.eventName)),
    consumed: consumedHandlers.sort((a, b) => a.handlerName.localeCompare(b.handlerName)),
  }

  const crossDomainEdges = buildCrossDomainEdges(graph, domainId)
  const aggregatedConnections = query.domainConnections(domainId)
  const entryPoints = extractEntryPoints(domainNodes)

  const repository = domainNodes
    .find((node) => node.sourceLocation?.repository !== undefined)
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
