import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { SearchComponentsInput } from './search-components-input'
import type { SearchComponentsResult } from './search-components-result'

/** @riviere-role command-use-case */
export function searchComponents(input: SearchComponentsInput): SearchComponentsResult {
  const repository = new RiviereQueryRepository()
  const loadedGraph = repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    throw {
      ...loadedGraph,
      kind: 'QUERY_GRAPH_LOAD_ERROR' as const,
    }
  }

  return { components: loadedGraph.query.search(input.term) }
}
