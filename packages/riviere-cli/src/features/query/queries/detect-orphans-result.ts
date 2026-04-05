import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role query-use-case-result-value */
export type OrphanComponent = ReturnType<RiviereQuery['detectOrphans']>[number]

/** @riviere-role query-use-case-result */
export interface DetectOrphansResult {orphans: OrphanComponent[]}
