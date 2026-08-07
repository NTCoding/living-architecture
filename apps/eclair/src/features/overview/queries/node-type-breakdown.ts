import type { Component } from '@living-architecture/riviere-schema'
import { getEffectiveNodeType } from '@/platform/domain/node-type-presentation'

export type NodeTypeBreakdown = Record<string, number>

export function getNodeTypeBreakdown(components: readonly Component[]): NodeTypeBreakdown {
  const counts = new Map<string, number>()
  for (const component of components) {
    const type = getEffectiveNodeType(component)
    counts.set(type, (counts.get(type) ?? 0) + 1)
  }
  return Object.fromEntries(counts)
}
