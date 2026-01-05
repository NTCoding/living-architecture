import type {
  Component, ComponentId 
} from '@living-architecture/riviere-schema';
import { ComponentNotFoundError } from './errors';
import { similarityScore } from './string-similarity';
import type {
  NearMatchMismatch, NearMatchOptions, NearMatchQuery, NearMatchResult 
} from './types';

function detectMismatch(
  query: NearMatchQuery,
  component: Component,
): NearMatchMismatch | undefined {
  const nameMatches = query.name.toLowerCase() === component.name.toLowerCase();

  if (!nameMatches) {
    return undefined;
  }

  if (query.type !== undefined && query.type !== component.type) {
    return {
      field: 'type',
      expected: query.type,
      actual: component.type,
    };
  }

  if (query.domain !== undefined && query.domain !== component.domain) {
    return {
      field: 'domain',
      expected: query.domain,
      actual: component.domain,
    };
  }

  return undefined;
}

/**
 * Finds components similar to a query using fuzzy matching.
 *
 * Used for error recovery to suggest alternatives when exact matches fail.
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
  components: Component[],
  query: NearMatchQuery,
  options?: NearMatchOptions,
): NearMatchResult[] {
  if (query.name === '') {
    return [];
  }

  const threshold = options?.threshold ?? 0.6;
  const limit = options?.limit ?? 10;

  const results = components
    .map((component): NearMatchResult => {
      const score = similarityScore(query.name, component.name);
      const mismatch = detectMismatch(query, component);
      return {
        component,
        score,
        mismatch,
      };
    })
    .filter((result) => result.score >= threshold || result.mismatch !== undefined)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
}

/**
 * Creates a typed error with suggestions for a missing source component.
 *
 * @param components - Array of existing components to search for suggestions
 * @param id - The ComponentId that was not found
 * @returns ComponentNotFoundError with suggestions array for programmatic access
 *
 * @example
 * ```typescript
 * const error = createSourceNotFoundError(components, ComponentId.parse('orders:checkout:api:create-ordr'))
 * // ComponentNotFoundError with suggestions: ['orders:checkout:api:create-order']
 * ```
 */
export function createSourceNotFoundError(
  components: Component[],
  id: ComponentId,
): ComponentNotFoundError {
  const matches = findNearMatches(components, { name: id.name() }, { limit: 3 });
  const suggestions = matches.map((s) => s.component.id);
  return new ComponentNotFoundError(id.toString(), suggestions);
}
