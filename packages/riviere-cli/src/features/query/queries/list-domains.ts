import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListDomainsInput } from './list-domains-input'
import type { ListDomainsResult } from './list-domains-result'

/** @riviere-role query-model-use-case */
export class ListDomains {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: ListDomainsInput): ListDomainsResult {
    const query = this.repository.load(input.graphPathOption)
    return { domains: query.domains() }
  }
}
