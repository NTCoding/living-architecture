import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListEntryPointsInput } from './list-entry-points-input'
import type { ListEntryPointsResult } from './list-entry-points-result'

/** @riviere-role command-use-case */
export function listEntryPoints(input: ListEntryPointsInput): ListEntryPointsResult {
  const repository = new RiviereQueryRepository()
  const loadedGraph = repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    throw {
      ...loadedGraph,
      kind: 'QUERY_GRAPH_LOAD_ERROR' as const,
    }
  }

  return { entryPoints: loadedGraph.query.entryPoints() }
}
