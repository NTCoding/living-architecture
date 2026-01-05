import type {
  Node, NodeType 
} from '@/types/riviere'
import { entryPointSchema } from '@/types/riviere'
import type { DomainNode } from './extractDomainDetails'

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
      location: formatLocation(node.sourceLocation.filePath, node.sourceLocation.lineNumber),
      sourceLocation: node.sourceLocation,
    }))
    .sort((a, b) => NODE_TYPE_PRIORITY[a.type] - NODE_TYPE_PRIORITY[b.type])
}

export function extractEntryPoints(nodes: Node[]): ReturnType<typeof entryPointSchema.parse>[] {
  const entryPoints: ReturnType<typeof entryPointSchema.parse>[] = []
  for (const node of nodes) {
    if (node.type === 'UI') {
      entryPoints.push(entryPointSchema.parse(node.route))
    } else if (node.type === 'API' && node.path !== undefined) {
      entryPoints.push(entryPointSchema.parse(node.path))
    }
  }
  return entryPoints
}
