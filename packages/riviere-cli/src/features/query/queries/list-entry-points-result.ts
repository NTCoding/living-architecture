import type { RiviereQuery } from '@living-architecture/riviere-query'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model */
export type EntryPointComponent = ReturnType<RiviereQuery['entryPoints']>[number]

/** @riviere-role query-model */
export interface EntryPointList {entryPoints: EntryPointComponent[]}

/** @riviere-role query-model */
export type ListEntryPointsResult = EntryPointList | QueryGraphLoadFailure
