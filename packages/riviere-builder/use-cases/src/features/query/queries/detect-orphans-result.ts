import { RiviereQuery } from '@living-architecture/riviere-builder-domain-model/query'
import type { ComponentId } from '@living-architecture/riviere-builder-domain-model/query/component-id'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-value */
export type OrphanComponent = ComponentId

/** @riviere-role query-model */
export class OrphanList {
  private constructor(readonly orphans: OrphanComponent[]) {}

  static parse(graph: unknown): OrphanList {
    return new OrphanList(RiviereQuery.fromJSON(graph).detectOrphans())
  }
}

/** @riviere-role query-model-value */
export type DetectOrphansResult = OrphanList | QueryGraphLoadFailure
