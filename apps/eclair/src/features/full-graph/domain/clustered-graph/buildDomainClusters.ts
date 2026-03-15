import type { Node } from '@/platform/domain/eclair-types'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'

export interface DomainClusterDefinition {
  readonly id: string
  readonly domain: string
  readonly label: string
  readonly nodeIds: readonly string[]
}

function isAlphaNumericCharacter(character: string): boolean {
  return (character >= 'a' && character <= 'z') || (character >= '0' && character <= '9')
}

function createClusterId(domain: string): string {
  const normalized = [...domain.toLowerCase()].reduce(
    (state, character) => {
      if (isAlphaNumericCharacter(character)) {
        return {
          value: `${state.value}${character}`,
          previousWasSeparator: false,
        }
      }

      if (state.previousWasSeparator || state.value.length === 0) {
        return state
      }

      return {
        value: `${state.value}_`,
        previousWasSeparator: true,
      }
    },
    {
      value: '',
      previousWasSeparator: false,
    },
  ).value
  const trimmed = normalized.endsWith('_') ? normalized.slice(0, -1) : normalized
  return `cluster_domain_${trimmed.length > 0 ? trimmed : 'unknown'}`
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
