import type { Node } from '@/platform/domain/eclair-types'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'

export interface DomainClusterDefinition {
  readonly id: string
  readonly domain: string
  readonly label: string
  readonly nodeIds: readonly string[]
}

function createClusterId(domain: string): string {
  const normalized = domain
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `cluster_domain_${normalized.length > 0 ? normalized : 'unknown'}`
}

export function buildDomainClusters(nodes: readonly Node[]): readonly DomainClusterDefinition[] {
  const nodeIdsByDomain = new Map<string, string[]>()

  for (const node of nodes) {
    if (node.domain === 'external') {
      continue
    }

    const existingNodeIds = nodeIdsByDomain.get(node.domain) ?? []
    existingNodeIds.push(node.id)
    nodeIdsByDomain.set(node.domain, existingNodeIds)
  }

  return [...nodeIdsByDomain.entries()]
    .sort(([left], [right]) => compareByCodePoint(left, right))
    .map(([domain, nodeIds]) => ({
      id: createClusterId(domain),
      domain,
      label: domain,
      nodeIds: [...nodeIds].sort(compareByCodePoint),
    }))
}
