import type {
  Node, Edge, NodeType 
} from '@/platform/domain/eclair-types'
import { getNodeTypeColor } from '@/platform/domain/node-type-presentation'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'
import type {
  SimulationNodeDatum, SimulationLinkDatum 
} from 'd3'

export interface SimulationNode extends SimulationNodeDatum {
  id: string
  type: NodeType
  effectiveType?: string | undefined
  typeDescription?: string | undefined
  name: string
  domain: string
  originalNode: Node
}

export interface SimulationLink extends SimulationLinkDatum<SimulationNode> {
  source: SimulationNode | string
  target: SimulationNode | string
  type: 'sync' | 'async' | undefined
  originalEdge: Edge
}

export interface TooltipData {
  node: SimulationNode
  x: number
  y: number
  incomingCount: number
  outgoingCount: number
}

interface NodeColors {
  stream: Record<NodeType, string>
  voltage: Record<NodeType, string>
  circuit: Record<NodeType, string>
}

/*
 * NODE TYPE COLORS - MUST STAY IN SYNC WITH CSS VARIABLES
 * =========================================================
 * Source of truth: /apps/eclair/src/platform/domain/node-type-presentation.ts
 * Documentation: /apps/eclair/docs/brand/graph-visualization.md
 *
 * When updating colors:
 * 1. Update node-type-presentation.ts
 * 2. Update matching CSS variables where they are still used
 * 3. Update the brand docs table
 */
export const NODE_COLORS: NodeColors = {
  stream: {
    UI: getNodeTypeColor('UI', 'stream'),
    API: getNodeTypeColor('API', 'stream'),
    UseCase: getNodeTypeColor('UseCase', 'stream'),
    DomainOp: getNodeTypeColor('DomainOp', 'stream'),
    Event: getNodeTypeColor('Event', 'stream'),
    EventHandler: getNodeTypeColor('EventHandler', 'stream'),
    Custom: getNodeTypeColor('Custom', 'stream'),
    External: getNodeTypeColor('External', 'stream'),
  },
  voltage: {
    UI: getNodeTypeColor('UI', 'voltage'),
    API: getNodeTypeColor('API', 'voltage'),
    UseCase: getNodeTypeColor('UseCase', 'voltage'),
    DomainOp: getNodeTypeColor('DomainOp', 'voltage'),
    Event: getNodeTypeColor('Event', 'voltage'),
    EventHandler: getNodeTypeColor('EventHandler', 'voltage'),
    Custom: getNodeTypeColor('Custom', 'voltage'),
    External: getNodeTypeColor('External', 'voltage'),
  },
  circuit: {
    UI: getNodeTypeColor('UI', 'circuit'),
    API: getNodeTypeColor('API', 'circuit'),
    UseCase: getNodeTypeColor('UseCase', 'circuit'),
    DomainOp: getNodeTypeColor('DomainOp', 'circuit'),
    Event: getNodeTypeColor('Event', 'circuit'),
    EventHandler: getNodeTypeColor('EventHandler', 'circuit'),
    Custom: getNodeTypeColor('Custom', 'circuit'),
    External: getNodeTypeColor('External', 'circuit'),
  },
}

export const NODE_RADII: Record<NodeType, number> = {
  UI: 12,
  API: 12,
  UseCase: 12,
  DomainOp: 12,
  Event: 12,
  EventHandler: 12,
  Custom: 12,
  External: 12,
}

export const EDGE_COLORS = {
  stream: {
    sync: '#0D9488',
    async: '#FF6B6B',
  },
  voltage: {
    sync: '#00D4FF',
    async: '#39FF14',
  },
  circuit: {
    sync: '#0969DA',
    async: '#1A7F37',
  },
}

export const SEMANTIC_EDGE_COLORS = {
  stream: {
    event: '#FF6B6B',
    default: '#0D9488',
  },
  voltage: {
    event: '#39FF14',
    default: '#00D4FF',
  },
  circuit: {
    event: '#1A7F37',
    default: '#0969DA',
  },
}

function getDomainPaletteColor(index: number): string {
  if (index === 0) return '#0F766E'
  if (index === 1) return '#7C3AED'
  if (index === 2) return '#0369A1'
  if (index === 3) return '#B45309'
  if (index === 4) return '#4338CA'
  if (index === 5) return '#0891B2'
  if (index === 6) return '#6D28D9'
  if (index === 7) return '#0E7490'
  if (index === 8) return '#4F46E5'
  return '#047857'
}

export function getDomainColor(domain: string, domains: string[]): string {
  const sortedDomains = [...domains].sort(compareByCodePoint)
  const index = sortedDomains.indexOf(domain)
  if (index === -1) return getDomainPaletteColor(0)
  return getDomainPaletteColor(index % 10)
}
