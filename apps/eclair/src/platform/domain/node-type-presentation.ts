import type {
  Component,
  RiviereGraph,
  CustomTypeDefinition,
} from '@living-architecture/riviere-schema-published-language/schema'
import type { Theme } from '@/types/theme'
import { ascendingCodePointSortResult } from './ascending-code-point-sort-result'

const BUILT_IN_NODE_COLORS: Record<Theme, Record<string, string>> = {
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

type NonEmptyPalette = readonly [string, ...string[]]

const CUSTOM_NODE_PALETTES: Record<Theme, NonEmptyPalette> = {
  stream: [
    '#7C3AED',
    '#0369A1',
    '#B45309',
    '#0F766E',
    '#BE123C',
    '#4338CA',
    '#047857',
    '#A21CAF',
    '#C2410C',
    '#4D7C0F',
    '#6D28D9',
    '#0E7490',
    '#9F1239',
    '#1D4ED8',
    '#15803D',
    '#A16207',
  ],
  voltage: [
    '#C4B5FD',
    '#38BDF8',
    '#FDBA74',
    '#2DD4BF',
    '#FDA4AF',
    '#A5B4FC',
    '#6EE7B7',
    '#F0ABFC',
    '#FB923C',
    '#BEF264',
    '#A78BFA',
    '#67E8F9',
    '#FB7185',
    '#60A5FA',
    '#4ADE80',
    '#FACC15',
  ],
  circuit: [
    '#8250DF',
    '#0969DA',
    '#9A6700',
    '#1A7F37',
    '#CF222E',
    '#3E4C9E',
    '#116329',
    '#8250DF',
    '#BC4C00',
    '#4D7C0F',
    '#6F42C1',
    '#0550AE',
    '#A40E26',
    '#218BFF',
    '#2DA44E',
    '#953800',
  ],
}

export function getEffectiveNodeType(component: Component): string {
  return component.type === 'Custom' ? component.customTypeName : component.type
}

export function getNodeTypesInGraph(graph: RiviereGraph, includeExternal = false): string[] {
  const types = new Set(graph.components.map(getEffectiveNodeType))
  if (includeExternal && (graph.externalLinks?.length ?? 0) > 0) {
    types.add('External')
  }
  return [...types].sort(ascendingCodePointSortResult)
}

function getNodeTypeDefinition(
  graph: RiviereGraph,
  type: string,
): CustomTypeDefinition | undefined {
  return graph.metadata.customTypes?.[type]
}

export function getNodeTypeDescription(graph: RiviereGraph, type: string): string | undefined {
  return getNodeTypeDefinition(graph, type)?.description
}

export function getNodeTypeColor(type: string, theme: Theme): string {
  const builtInColor = BUILT_IN_NODE_COLORS[theme][type]
  if (builtInColor !== undefined) return builtInColor

  const palette = CUSTOM_NODE_PALETTES[theme]
  const targetIndex = stableHash(type) % palette.length
  return palette.reduce((selected, candidate, index) =>
    index === targetIndex ? candidate : selected,
  )
}

function stableHash(value: string): number {
  return (
    [...value].reduce(
      (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619),
      2166136261,
    ) >>> 0
  )
}
