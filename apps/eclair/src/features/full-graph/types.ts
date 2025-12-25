import type { Node, Edge, NodeType } from '@/types/riviere'
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3'

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

export type Theme = 'stream' | 'voltage' | 'circuit'

export interface NodeColors {
  stream: Record<NodeType, string>
  voltage: Record<NodeType, string>
  circuit: Record<NodeType, string>
}

export const NODE_COLORS: NodeColors = {
  stream: {
    UI: '#94A3B8',
    API: '#14B8A6',
    UseCase: '#A78BFA',
    DomainOp: '#94A3B8',
    Event: '#FBBF24',
    EventHandler: '#A78BFA',
    Custom: '#9CA3AF',
  },
  voltage: {
    UI: '#94A3B8',
    API: '#22D3EE',
    UseCase: '#A78BFA',
    DomainOp: '#94A3B8',
    Event: '#FBBF24',
    EventHandler: '#A78BFA',
    Custom: '#9CA3AF',
  },
  circuit: {
    UI: '#9CA3AF',
    API: '#6B7280',
    UseCase: '#6B7280',
    DomainOp: '#4B5563',
    Event: '#D97706',
    EventHandler: '#6B7280',
    Custom: '#9CA3AF',
  },
}

export const NODE_RADII: Record<NodeType, number> = {
  UI: 14,
  API: 12,
  UseCase: 11,
  DomainOp: 10,
  Event: 11,
  EventHandler: 10,
  Custom: 10,
}

export const EDGE_COLORS = {
  stream: { sync: '#0D9488', async: '#FF6B6B' },
  voltage: { sync: '#00D4FF', async: '#39FF14' },
  circuit: { sync: '#0969DA', async: '#1A7F37' },
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
  const sortedDomains = [...domains].sort()
  const index = sortedDomains.indexOf(domain)
  if (index === -1) return getDomainPaletteColor(0)
  return getDomainPaletteColor(index % 10)
}
