import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { ListDomainsInput } from './list-domains-input'
import type { ListDomainsResult } from './list-domains-result'

/** @riviere-role command-use-case */
export function listDomains(input: ListDomainsInput): ListDomainsResult {
  const repository = new RiviereQueryRepository()
  const query = repository.load(input.graphPathOption)
  return { domains: query.domains() }
}
