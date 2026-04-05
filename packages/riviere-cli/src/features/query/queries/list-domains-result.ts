import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role query-use-case-result-value */
export type DomainSummary = ReturnType<RiviereQuery['domains']>[number]

/** @riviere-role query-use-case-result */
export interface ListDomainsResult {domains: DomainSummary[]}
