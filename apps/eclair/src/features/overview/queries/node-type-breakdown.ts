import type { Component } from '@living-architecture/riviere-schema'
import { getEffectiveNodeType } from '@/platform/domain/node-type-presentation'

export type NodeTypeBreakdown = Record<string, number>

export function getNodeTypeBreakdown(components: readonly Component[]): NodeTypeBreakdown {
  return components.reduce<NodeTypeBreakdown>((counts, component) => {
    const type = getEffectiveNodeType(component)
    counts[type] = (counts[type] ?? 0) + 1
    return counts
  }, {})
}
