import type { RiviereQuery } from '@living-architecture/riviere-query'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model */
export type ListedComponent = ReturnType<RiviereQuery['components']>[number]

/** @riviere-role query-model */
export type ListComponentsResult = { components: ListedComponent[] } | QueryGraphLoadFailure
