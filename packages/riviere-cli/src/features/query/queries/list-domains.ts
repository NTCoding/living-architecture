import { RiviereQueryRepository } from '../data-access/riviere-query-repository'
import type { ListDomainsInput } from './list-domains-input'
import type { ListDomainsResult } from './list-domains-result'
import { loadQueryGraph } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class ListDomains {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: ListDomainsInput): ListDomainsResult {
    const loaded = loadQueryGraph(this.repository, input.graphPathOption)
    if (loaded.kind !== 'loaded') {
      return loaded
    }
    return { domains: loaded.query.domains() }
  }
}
