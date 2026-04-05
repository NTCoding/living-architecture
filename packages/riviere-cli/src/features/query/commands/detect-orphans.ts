import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { DetectOrphansInput } from './detect-orphans-input'
import type { DetectOrphansResult } from './detect-orphans-result'

/** @riviere-role command-use-case */
export function detectOrphans(input: DetectOrphansInput): DetectOrphansResult {
  const repository = new RiviereQueryRepository()
  const loadedGraph = repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    throw {
      ...loadedGraph,
      kind: 'QUERY_GRAPH_LOAD_ERROR' as const,
    }
  }

  return { orphans: loadedGraph.query.detectOrphans() }
}
