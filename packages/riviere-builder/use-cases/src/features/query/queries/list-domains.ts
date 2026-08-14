import { DomainListLoader } from '../data-access/graph/query-loaders'
import type { ListDomainsInput } from './list-domains-input'
import type { ListDomainsResult } from './list-domains-result'
import { toQueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class ListDomains {
  constructor(private readonly domains: DomainListLoader) {}

  execute(input: ListDomainsInput): ListDomainsResult {
    try {
      return this.domains.load(input.graphPathOption)
    } catch (error) {
      const failure = toQueryGraphLoadFailure(error)
      if (failure !== undefined) {
        return failure
      }
      throw error
    }
  }
}
