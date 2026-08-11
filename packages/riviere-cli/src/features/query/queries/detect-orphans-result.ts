import type { RiviereQuery } from '@living-architecture/riviere-query'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model */
export type OrphanComponent = ReturnType<RiviereQuery['detectOrphans']>[number]

/** @riviere-role query-model */
export interface OrphanList {orphans: OrphanComponent[]}

/** @riviere-role query-model */
export type DetectOrphansResult = OrphanList | QueryGraphLoadFailure
