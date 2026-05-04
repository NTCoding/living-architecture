import type { RiviereQuery } from '@living-architecture/riviere-query'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model */
export type SearchComponent = ReturnType<RiviereQuery['search']>[number]

/** @riviere-role query-model */
export type SearchComponentsResult = { components: SearchComponent[] } | QueryGraphLoadFailure
