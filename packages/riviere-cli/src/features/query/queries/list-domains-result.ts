import type { RiviereQuery } from '@living-architecture/riviere-query'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model */
export type DomainSummary = ReturnType<RiviereQuery['domains']>[number]

/** @riviere-role query-model */
export type ListDomainsResult = { domains: DomainSummary[] } | QueryGraphLoadFailure
