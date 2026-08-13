import { RiviereQuery } from '@living-architecture/riviere-builder/query'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model */
export type EntryPointComponent = ReturnType<RiviereQuery['entryPoints']>[number]

/** @riviere-role query-model */
export class EntryPointList {
  private constructor(readonly entryPoints: EntryPointComponent[]) {}

  static parse(graph: unknown): EntryPointList {
    return new EntryPointList(RiviereQuery.fromJSON(graph).entryPoints())
  }
}

/** @riviere-role query-model */
export type ListEntryPointsResult = EntryPointList | QueryGraphLoadFailure
