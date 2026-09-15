import { RiviereQuery } from '@living-architecture/riviere-builder-domain-model/query'
import type { Component } from '@living-architecture/riviere-schema-published-language/schema'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-value */
export type EntryPointComponent = Component

/** @riviere-role query-model */
export class EntryPointList {
  private constructor(readonly entryPoints: EntryPointComponent[]) {}

  static parse(graph: unknown): EntryPointList {
    return new EntryPointList(RiviereQuery.fromJSON(graph).entryPoints())
  }
}

/** @riviere-role query-model-value */
export type ListEntryPointsResult = EntryPointList | QueryGraphLoadFailure
