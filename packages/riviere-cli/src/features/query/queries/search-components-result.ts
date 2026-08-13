import { RiviereQuery } from '@living-architecture/riviere-query'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model */
export type SearchComponent = ReturnType<RiviereQuery['search']>[number]

/** @riviere-role query-model */
export class ComponentSearch {
  private constructor(readonly components: SearchComponent[]) {}

  static parse(graph: unknown, term: string): ComponentSearch {
    return new ComponentSearch(RiviereQuery.fromJSON(graph).search(term))
  }
}

/** @riviere-role query-model */
export type SearchComponentsResult = ComponentSearch | QueryGraphLoadFailure
