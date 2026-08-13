import { RiviereQuery } from '@living-architecture/riviere-query'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model */
export type DomainSummary = ReturnType<RiviereQuery['domains']>[number]

/** @riviere-role query-model */
export class DomainList {
  private constructor(readonly domains: DomainSummary[]) {}

  static parse(graph: unknown): DomainList {
    return new DomainList(RiviereQuery.fromJSON(graph).domains())
  }
}

/** @riviere-role query-model */
export type ListDomainsResult = DomainList | QueryGraphLoadFailure
