import type {
  Node, Edge, NodeType 
} from '@/platform/domain/eclair-types'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'
import type {
  SimulationNodeDatum, SimulationLinkDatum 
} from 'd3'

export interface SimulationNode extends SimulationNodeDatum {
  id: string
  type: NodeType
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
 * Source of truth: /apps/eclair/src/index.css (CSS variables)
 * Documentation: /apps/eclair/docs/brand/graph-visualization.md
 *
 * When updating colors:
 * 1. Update index.css :root and theme classes
 * 2. Update this NODE_COLORS object to match
 * 3. Update brand docs table
 */
export const NODE_COLORS: NodeColors = {
  stream: {
    UI: '#F43F5E',
    API: '#0D9488',
    UseCase: '#A78BFA',
    DomainOp: '#06B6D4',
    Event: '#F59E0B',
    EventHandler: '#EAB308',
    Custom: '#78716C',
    External: '#94A3B8',
  },
  voltage: {
    UI: '#FB7185',
    API: '#00D4FF',
    UseCase: '#C4B5FD',
    DomainOp: '#22D3EE',
    Event: '#F97316',
    EventHandler: '#FACC15',
    Custom: '#A8A29E',
    External: '#94A3B8',
  },
  circuit: {
    UI: '#E11D48',
    API: '#0969DA',
    UseCase: '#A78BFA',
    DomainOp: '#0550AE',
    Event: '#BF8700',
    EventHandler: '#9A6700',
    Custom: '#57534E',
    External: '#9CA3AF',
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
