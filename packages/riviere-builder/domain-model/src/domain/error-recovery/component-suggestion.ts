import type { Component } from '@living-architecture/riviere-schema-published-language/schema'
import { similarityScore } from '../text-similarity/string-similarity'
type NearMatchQuery = Readonly<{
  name: string
  type?: import('@living-architecture/riviere-schema-published-language/schema').ComponentType
  domain?: string
}>

type NearMatchOptions = Readonly<{
  threshold?: number
  limit?: number
}>

type NearMatchMismatch = Readonly<{
  field: 'type' | 'domain'
  expected: string
  actual: string
}>

type NearMatchResult = Readonly<{
  component: Component
  score: number
  mismatch?: NearMatchMismatch
}>

function detectMismatch(
  query: NearMatchQuery,
  component: Component,
): NearMatchMismatch | undefined {
  const nameMatches = query.name.toLowerCase() === component.name.toLowerCase()

  if (!nameMatches) {
    return undefined
  }

  if (query.type !== undefined && query.type !== component.type) {
    return {
      field: 'type',
      expected: query.type,
      actual: component.type,
    }
  }

  if (query.domain !== undefined && query.domain !== component.domain) {
    return {
      field: 'domain',
      expected: query.domain,
      actual: component.domain,
    }
  }

  return undefined
}

/**
 * Finds components similar to a query using fuzzy matching.
 *
 * Used for error recovery to suggest alternatives when exact matches fail.
 *
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 *
 * @param components - Array of components to search
 * @param query - Search criteria with name and optional type/domain filters
 * @param options - Optional threshold and limit settings
 * @returns Array of matching components with similarity scores
 *
 * @example
 * ```typescript
 * const matches = findNearMatches(components, { name: 'Create Ordr' })
 * // [{ component: {...}, score: 0.9, mismatch: undefined }]
 * ```
 */
export function findNearMatches(
  components: readonly Component[],
  query: NearMatchQuery,
  options?: NearMatchOptions,
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
      return {
        component,
        score,
        ...(mismatch !== undefined && { mismatch }),
      }
    })
    .filter((result) => result.score >= threshold || result.mismatch !== undefined)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return results
}
