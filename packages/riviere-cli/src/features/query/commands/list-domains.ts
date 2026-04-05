import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListDomainsInput } from './list-domains-input'
import type { ListDomainsResult } from './list-domains-result'

/** @riviere-role command-use-case */
export function listDomains(input: ListDomainsInput): ListDomainsResult {
  const repository = new RiviereQueryRepository()
  const loadedGraph = repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    throw {
      ...loadedGraph,
      kind: 'QUERY_GRAPH_LOAD_ERROR' as const,
    }
  }

  return { domains: loadedGraph.query.domains() }
}
