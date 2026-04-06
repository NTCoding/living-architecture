import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role query-model */
export type DomainSummary = ReturnType<RiviereQuery['domains']>[number]

/** @riviere-role query-model */
export interface ListDomainsResult {domains: DomainSummary[]}
