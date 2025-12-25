import type { Node, SourceLocation, NodeType } from '@/types/riviere'
import {
  OperationNameSchema,
  StateNameSchema,
  EntryPointSchema,
} from '@/types/riviere'
import type {
  DomainEntity,
  DomainNode,
  OperationDetail,
} from './extractDomainDetails'

export interface NodeBreakdown {
  UI: number
  API: number
  UseCase: number
  DomainOp: number
  Event: number
  EventHandler: number
  Custom: number
}

const NODE_TYPE_PRIORITY: Record<NodeType, number> = {
  UI: 1,
  API: 2,
  UseCase: 3,
  DomainOp: 4,
  Event: 5,
  EventHandler: 6,
  Custom: 7,
}

export function countNodesByType(nodes: Node[]): NodeBreakdown {
  const breakdown: NodeBreakdown = {
    UI: 0,
    API: 0,
    UseCase: 0,
    DomainOp: 0,
    Event: 0,
    EventHandler: 0,
    Custom: 0,
  }
  for (const node of nodes) {
    breakdown[node.type]++
  }
  return breakdown
}

function formatLocation(filePath: string, lineNumber: number | undefined): string {
  if (lineNumber !== undefined) {
    return `${filePath}:${lineNumber}`
  }
  return filePath
}

export function formatDomainNodes(nodes: Node[]): DomainNode[] {
  return nodes
    .map((node) => ({
      id: node.id,
      type: node.type,
      name: node.name,
      location:
        node.sourceLocation !== undefined
          ? formatLocation(node.sourceLocation.filePath, node.sourceLocation.lineNumber)
          : undefined,
      sourceLocation: node.sourceLocation,
    }))
    .sort((a, b) => NODE_TYPE_PRIORITY[a.type] - NODE_TYPE_PRIORITY[b.type])
}

interface EntityData {
  operations: Set<string>
  operationDetails: OperationDetail[]
  allStates: Set<string>
  firstSourceLocation: SourceLocation | undefined
}

function collectStateTransitions(node: Node, allStates: Set<string>): void {
  if (node.type === 'DomainOp' && node.stateChanges !== undefined) {
    for (const sc of node.stateChanges) {
      allStates.add(sc.from)
      allStates.add(sc.to)
    }
  }
}

function parseOperationName(name: string): ReturnType<typeof OperationNameSchema.parse> {
  return OperationNameSchema.parse(name)
}

function parseStateName(name: string): ReturnType<typeof StateNameSchema.parse> {
  return StateNameSchema.parse(name)
}

function mergeOperationIntoEntity(
  existing: EntityData,
  node: Node,
  opDetail: OperationDetail
): void {
  if (node.type !== 'DomainOp') {
    throw new Error(`Expected DomainOp node, got ${node.type}: ${node.id}`)
  }
  existing.operations.add(node.operationName)
  existing.operationDetails.push(opDetail)
  collectStateTransitions(node, existing.allStates)
  if (existing.firstSourceLocation === undefined && node.sourceLocation !== undefined) {
    existing.firstSourceLocation = node.sourceLocation
  }
}

function orderStatesByTransitions(states: Set<string>, operations: OperationDetail[]): string[] {
  const fromStates = new Set<string>()
  const toStates = new Set<string>()
  const transitionMap = new Map<string, string>()

  for (const op of operations) {
    if (op.stateChanges === undefined) {
      continue
    }
    for (const transition of op.stateChanges) {
      fromStates.add(transition.from)
      toStates.add(transition.to)
      transitionMap.set(transition.from, transition.to)
    }
  }

  const initialStates = Array.from(fromStates).filter((s) => !toStates.has(s))
  const orderedStates: string[] = []
  const visited = new Set<string>()

  function followChain(state: string): void {
    if (visited.has(state)) return
    visited.add(state)
    orderedStates.push(state)
    const nextState = transitionMap.get(state)
    if (nextState !== undefined) {
      followChain(nextState)
    }
  }

  for (const initial of initialStates) {
    followChain(initial)
  }

  for (const state of states) {
    if (!visited.has(state)) {
      orderedStates.push(state)
    }
  }

  return orderedStates
}

export function extractEntities(domainNodes: Node[]): DomainEntity[] {
  const entityMap = new Map<string, EntityData>()

  for (const node of domainNodes) {
    if (node.type !== 'DomainOp' || node.entity === undefined || node.operationName === undefined) {
      continue
    }

    const opDetail: OperationDetail = {
      id: node.id,
      operationName: parseOperationName(node.operationName),
      name: node.name,
      behavior: node.behavior,
      stateChanges: node.stateChanges,
      signature: node.signature,
      sourceLocation: node.sourceLocation,
    }

    const existing = entityMap.get(node.entity)
    if (existing !== undefined) {
      mergeOperationIntoEntity(existing, node, opDetail)
    } else {
      const allStates = new Set<string>()
      collectStateTransitions(node, allStates)
      entityMap.set(node.entity, {
        operations: new Set([node.operationName]),
        operationDetails: [opDetail],
        allStates,
        firstSourceLocation: node.sourceLocation,
      })
    }
  }

  return Array.from(entityMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, data]) => ({
      name,
      description: undefined,
      operations: Array.from(data.operations).sort().map(parseOperationName),
      operationDetails: data.operationDetails.sort((a, b) =>
        a.operationName.localeCompare(b.operationName)
      ),
      allStates: orderStatesByTransitions(data.allStates, data.operationDetails).map(parseStateName),
      invariants: [],
      sourceLocation: data.firstSourceLocation,
    }))
}

export function extractEntryPoints(nodes: Node[]): ReturnType<typeof EntryPointSchema.parse>[] {
  const entryPoints: ReturnType<typeof EntryPointSchema.parse>[] = []
  for (const node of nodes) {
    if (node.type === 'UI') {
      entryPoints.push(EntryPointSchema.parse(node.route))
    } else if (node.type === 'API' && node.path !== undefined) {
      entryPoints.push(EntryPointSchema.parse(node.path))
    }
  }
  return entryPoints
}
