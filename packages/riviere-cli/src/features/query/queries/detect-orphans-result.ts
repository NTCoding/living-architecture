import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role query-model */
export type OrphanComponent = ReturnType<RiviereQuery['detectOrphans']>[number]

/** @riviere-role query-model */
export interface DetectOrphansResult {orphans: OrphanComponent[]}
