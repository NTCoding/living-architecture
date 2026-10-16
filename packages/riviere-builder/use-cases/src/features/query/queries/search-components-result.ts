import { RiviereQuery } from '@living-architecture/riviere-builder-domain-model/query'
import type { Component } from '@living-architecture/riviere-schema-published-language/schema'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-value */
export type SearchComponent = Component

/** @riviere-role query-model */
export class ComponentSearch {
  private constructor(readonly components: SearchComponent[]) {}

  static parse(graph: unknown, term: string): ComponentSearch {
    return new ComponentSearch(RiviereQuery.fromJSON(graph).search(term))
  }
}

/** @riviere-role query-model-value */
export type SearchComponentsResult = ComponentSearch | QueryGraphLoadFailure
