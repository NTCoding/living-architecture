import type { Component } from '@living-architecture/riviere-schema'
import type { ComponentId } from './component-id'
import { similarityScore } from './string-similarity'
import type { NearMatchMismatch, NearMatchOptions, NearMatchQuery, NearMatchResult } from './types'

function detectMismatch(query: NearMatchQuery, component: Component): NearMatchMismatch | undefined {
  const nameMatches = query.name.toLowerCase() === component.name.toLowerCase()

  if (!nameMatches) {
    return undefined
  }

  if (query.type !== undefined && query.type !== component.type) {
    return { field: 'type', expected: query.type, actual: component.type }
  }

  if (query.domain !== undefined && query.domain !== component.domain) {
    return { field: 'domain', expected: query.domain, actual: component.domain }
  }

  return undefined
}

export function findNearMatches(
  components: Component[],
  query: NearMatchQuery,
  options?: NearMatchOptions
): NearMatchResult[] {
  if (query.name === '') {
    return []
  }

  const threshold = options?.threshold ?? 0.6
  const limit = options?.limit ?? 10

  const results = components
    .map((component): NearMatchResult => {
      const score = similarityScore(query.name, component.name)
      const mismatch = detectMismatch(query, component)
      return { component, score, mismatch }
    })
    .filter((result) => result.score >= threshold || result.mismatch !== undefined)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return results
}

export function createSourceNotFoundError(components: Component[], id: ComponentId): Error {
  const suggestions = findNearMatches(components, { name: id.name() }, { limit: 3 })
  const baseMessage = `Source component '${id}' not found`
  if (suggestions.length === 0) {
    return new Error(baseMessage)
  }
  const suggestionIds = suggestions.map((s) => s.component.id).join(', ')
  return new Error(`${baseMessage}. Did you mean: ${suggestionIds}?`)
}
