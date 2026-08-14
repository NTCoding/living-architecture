import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { getEffectiveNodeType } from '@/platform/domain/node-type-presentation'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'

export interface NodeTypeInfo {
  type: string
  nodeCount: number
}

export function extractNodeTypes(graph: RiviereGraph): NodeTypeInfo[] {
  const typeCounts = new Map<string, number>()

  for (const node of graph.components) {
    const type = getEffectiveNodeType(node)
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1)
  }

  if (graph.externalLinks !== undefined && graph.externalLinks.length > 0) {
    const uniqueExternals = new Set(graph.externalLinks.map((link) => link.target.name))
    typeCounts.set('External', uniqueExternals.size)
  }

  return [...typeCounts.entries()]
    .map(([type, nodeCount]) => ({
      type,
      nodeCount,
    }))
    .sort((left, right) => compareByCodePoint(left.type, right.type))
}
