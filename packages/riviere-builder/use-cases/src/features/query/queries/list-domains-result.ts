import { RiviereQuery } from '@living-architecture/riviere-builder-domain-model/query'
import type { Domain } from '@living-architecture/riviere-builder-domain-model/query/domain'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-value */
export type DomainSummary = Domain

/** @riviere-role query-model */
export class DomainList {
  private constructor(readonly domains: DomainSummary[]) {}

  static parse(graph: unknown): DomainList {
    return new DomainList(RiviereQuery.fromJSON(graph).domains())
  }
}

/** @riviere-role query-model-value */
export type ListDomainsResult = DomainList | QueryGraphLoadFailure
