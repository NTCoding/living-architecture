import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListDomainsInput } from './list-domains-input'
import type { ListDomainsResult } from './list-domains-result'

/** @riviere-role command-use-case */
export async function listDomains(input: ListDomainsInput): Promise<ListDomainsResult> {
  const repository = new RiviereQueryRepository()
  const loadedGraph = await repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    throw new Error(`Failed to load graph at ${loadedGraph.graphPath}`)
  }

  return {
    domains: loadedGraph.query.domains(),
  }
}
