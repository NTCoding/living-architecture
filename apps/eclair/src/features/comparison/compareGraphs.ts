import type { RiviereGraph, Node, Edge, NodeType, NodeId } from '@/types/riviere'

export type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface NodeAddition {
  node: Node
}

export interface NodeRemoval {
  node: Node
}

export interface NodeModification {
  before: Node
  after: Node
  changedFields: string[]
}

export interface EdgeAddition {
  edge: Edge
}

export interface EdgeRemoval {
  edge: Edge
}

export interface EdgeModification {
  before: Edge
  after: Edge
  changedFields: string[]
}

export interface NodeDiff {
  added: NodeAddition[]
  removed: NodeRemoval[]
  modified: NodeModification[]
  unchanged: Node[]
}

export interface EdgeDiff {
  added: EdgeAddition[]
  removed: EdgeRemoval[]
  modified: EdgeModification[]
  unchanged: Edge[]
}

export interface DiffStats {
  nodesAdded: number
  nodesRemoved: number
  nodesModified: number
  nodesUnchanged: number
  edgesAdded: number
  edgesRemoved: number
  edgesModified: number
  edgesUnchanged: number
}

export interface DomainChanges {
  added: NodeAddition[]
  removed: NodeRemoval[]
  modified: NodeModification[]
}

export interface NodeTypeChanges {
  added: NodeAddition[]
  removed: NodeRemoval[]
  modified: NodeModification[]
}

interface ByDomainAccumulator {
  data: Record<string, DomainChanges>
}

interface ByNodeTypeAccumulator {
  data: Map<NodeType, NodeTypeChanges>
}

export interface GraphDiff {
  nodes: NodeDiff
  edges: EdgeDiff
  stats: DiffStats
  byDomain: Record<string, DomainChanges>
  byNodeType: Partial<Record<NodeType, NodeTypeChanges>>
}

function createEdgeKey(edge: Edge): string {
  return `${edge.source}->${edge.target}`
}

function getCommonNodeField(node: Node, key: string): unknown {
  const commonFields: Record<string, unknown> = {
    type: node.type,
    name: node.name,
    domain: node.domain,
    module: node.module,
    description: node.description,
    sourceLocation: node.sourceLocation,
    metadata: node.metadata,
  }
  return commonFields[key]
}

function getUINodeField(node: Node, key: string): unknown {
  if (node.type !== 'UI') return undefined
  if (key === 'route') return node.route
  return undefined
}

function getAPINodeField(node: Node, key: string): unknown {
  if (node.type !== 'API') return undefined
  const apiFields: Record<string, unknown> = {
    apiType: node.apiType,
    httpMethod: node.httpMethod,
    path: node.path,
  }
  return apiFields[key]
}

function getDomainOpNodeField(node: Node, key: string): unknown {
  if (node.type !== 'DomainOp') return undefined
  const domainOpFields: Record<string, unknown> = {
    operationName: node.operationName,
    entity: node.entity,
    signature: node.signature,
    behavior: node.behavior,
    stateChanges: node.stateChanges,
  }
  return domainOpFields[key]
}

function getEventNodeField(node: Node, key: string): unknown {
  if (node.type !== 'Event') return undefined
  const eventFields: Record<string, unknown> = {
    eventName: node.eventName,
    eventSchema: node.eventSchema,
  }
  return eventFields[key]
}

function getEventHandlerNodeField(node: Node, key: string): unknown {
  if (node.type !== 'EventHandler') return undefined
  if (key === 'subscribedEvents') return node.subscribedEvents
  return undefined
}

function getNodeFieldValue(node: Node, key: string): unknown {
  return getCommonNodeField(node, key)
    ?? getUINodeField(node, key)
    ?? getAPINodeField(node, key)
    ?? getDomainOpNodeField(node, key)
    ?? getEventNodeField(node, key)
    ?? getEventHandlerNodeField(node, key)
}

function getChangedNodeFields(before: Node, after: Node): string[] {
  const keys = [
    'type', 'name', 'domain', 'module', 'description', 'sourceLocation',
    'metadata', 'route', 'apiType', 'httpMethod', 'path', 'operationName', 'entity',
    'eventName', 'eventSchema', 'subscribedEvents', 'signature', 'behavior', 'stateChanges',
  ]

  const changed: string[] = []
  for (const key of keys) {
    const beforeVal = JSON.stringify(getNodeFieldValue(before, key))
    const afterVal = JSON.stringify(getNodeFieldValue(after, key))
    if (beforeVal !== afterVal) {
      changed.push(key)
    }
  }
  return changed
}

function getChangedEdgeFields(before: Edge, after: Edge): string[] {
  const keys: (keyof Edge)[] = ['type', 'payload', 'sourceLocation', 'metadata']

  const changed: string[] = []
  for (const key of keys) {
    const beforeVal = JSON.stringify(before[key])
    const afterVal = JSON.stringify(after[key])
    if (beforeVal !== afterVal) {
      changed.push(key)
    }
  }
  return changed
}

function initializeDomainChanges(): DomainChanges {
  return { added: [], removed: [], modified: [] }
}

function initializeNodeTypeChanges(): NodeTypeChanges {
  return { added: [], removed: [], modified: [] }
}

function ensureDomainEntry(acc: ByDomainAccumulator, domain: string): DomainChanges {
  acc.data[domain] ??= initializeDomainChanges()
  return acc.data[domain]
}

function ensureNodeTypeEntry(acc: ByNodeTypeAccumulator, nodeType: NodeType): NodeTypeChanges {
  if (!acc.data.has(nodeType)) {
    acc.data.set(nodeType, initializeNodeTypeChanges())
  }
  const entry = acc.data.get(nodeType)
  if (entry === undefined) {
    throw new Error(`Failed to initialize NodeTypeChanges for ${nodeType}`)
  }
  return entry
}

function recordAddition(
  addition: NodeAddition,
  nodeDiff: NodeDiff,
  byDomain: ByDomainAccumulator,
  byNodeType: ByNodeTypeAccumulator
): void {
  nodeDiff.added.push(addition)
  ensureDomainEntry(byDomain, addition.node.domain).added.push(addition)
  ensureNodeTypeEntry(byNodeType, addition.node.type).added.push(addition)
}

function recordModification(
  modification: NodeModification,
  nodeDiff: NodeDiff,
  byDomain: ByDomainAccumulator,
  byNodeType: ByNodeTypeAccumulator
): void {
  nodeDiff.modified.push(modification)
  ensureDomainEntry(byDomain, modification.after.domain).modified.push(modification)
  ensureNodeTypeEntry(byNodeType, modification.after.type).modified.push(modification)
}

function recordRemoval(
  removal: NodeRemoval,
  nodeDiff: NodeDiff,
  byDomain: ByDomainAccumulator,
  byNodeType: ByNodeTypeAccumulator
): void {
  nodeDiff.removed.push(removal)
  ensureDomainEntry(byDomain, removal.node.domain).removed.push(removal)
  ensureNodeTypeEntry(byNodeType, removal.node.type).removed.push(removal)
}

function compareNodes(
  beforeNodes: Node[],
  afterNodes: Node[],
  byDomain: ByDomainAccumulator,
  byNodeType: ByNodeTypeAccumulator
): NodeDiff {
  const beforeNodesById = new Map<NodeId, Node>(beforeNodes.map((n) => [n.id, n]))
  const afterNodesById = new Map<NodeId, Node>(afterNodes.map((n) => [n.id, n]))

  const nodeDiff: NodeDiff = { added: [], removed: [], modified: [], unchanged: [] }

  for (const afterNode of afterNodes) {
    const beforeNode = beforeNodesById.get(afterNode.id)

    if (!beforeNode) {
      recordAddition({ node: afterNode }, nodeDiff, byDomain, byNodeType)
      continue
    }

    const changedFields = getChangedNodeFields(beforeNode, afterNode)
    if (changedFields.length > 0) {
      recordModification({ before: beforeNode, after: afterNode, changedFields }, nodeDiff, byDomain, byNodeType)
    } else {
      nodeDiff.unchanged.push(afterNode)
    }
  }

  for (const beforeNode of beforeNodes) {
    if (!afterNodesById.has(beforeNode.id)) {
      recordRemoval({ node: beforeNode }, nodeDiff, byDomain, byNodeType)
    }
  }

  return nodeDiff
}

function compareEdges(beforeEdges: Edge[], afterEdges: Edge[]): EdgeDiff {
  const beforeEdgesByKey = new Map(beforeEdges.map((e) => [createEdgeKey(e), e]))
  const afterEdgesByKey = new Map(afterEdges.map((e) => [createEdgeKey(e), e]))

  const edgeDiff: EdgeDiff = { added: [], removed: [], modified: [], unchanged: [] }

  for (const afterEdge of afterEdges) {
    const key = createEdgeKey(afterEdge)
    const beforeEdge = beforeEdgesByKey.get(key)

    if (!beforeEdge) {
      edgeDiff.added.push({ edge: afterEdge })
      continue
    }

    const changedFields = getChangedEdgeFields(beforeEdge, afterEdge)
    if (changedFields.length > 0) {
      edgeDiff.modified.push({ before: beforeEdge, after: afterEdge, changedFields })
    } else {
      edgeDiff.unchanged.push(afterEdge)
    }
  }

  for (const beforeEdge of beforeEdges) {
    const key = createEdgeKey(beforeEdge)
    if (!afterEdgesByKey.has(key)) {
      edgeDiff.removed.push({ edge: beforeEdge })
    }
  }

  return edgeDiff
}

function computeStats(nodeDiff: NodeDiff, edgeDiff: EdgeDiff): DiffStats {
  return {
    nodesAdded: nodeDiff.added.length,
    nodesRemoved: nodeDiff.removed.length,
    nodesModified: nodeDiff.modified.length,
    nodesUnchanged: nodeDiff.unchanged.length,
    edgesAdded: edgeDiff.added.length,
    edgesRemoved: edgeDiff.removed.length,
    edgesModified: edgeDiff.modified.length,
    edgesUnchanged: edgeDiff.unchanged.length,
  }
}

function nodeTypeMapToPartialRecord(map: Map<NodeType, NodeTypeChanges>): Partial<Record<NodeType, NodeTypeChanges>> {
  const result: Partial<Record<NodeType, NodeTypeChanges>> = {}
  for (const [key, value] of map) {
    result[key] = value
  }
  return result
}

export function compareGraphs(before: RiviereGraph, after: RiviereGraph): GraphDiff {
  const byDomain: ByDomainAccumulator = { data: {} }
  const byNodeType: ByNodeTypeAccumulator = { data: new Map() }

  const nodeDiff = compareNodes(before.components, after.components, byDomain, byNodeType)
  const edgeDiff = compareEdges(before.links, after.links)
  const stats = computeStats(nodeDiff, edgeDiff)

  return {
    nodes: nodeDiff,
    edges: edgeDiff,
    stats,
    byDomain: byDomain.data,
    byNodeType: nodeTypeMapToPartialRecord(byNodeType.data),
  }
}
