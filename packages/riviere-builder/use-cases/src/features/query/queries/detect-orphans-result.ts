import { RiviereQuery } from '@living-architecture/riviere-builder/query'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model */
export type OrphanComponent = ReturnType<RiviereQuery['detectOrphans']>[number]

/** @riviere-role query-model */
export class OrphanList {
  private constructor(readonly orphans: OrphanComponent[]) {}

  static parse(graph: unknown): OrphanList {
    return new OrphanList(RiviereQuery.fromJSON(graph).detectOrphans())
  }
}

/** @riviere-role query-model */
export type DetectOrphansResult = OrphanList | QueryGraphLoadFailure
