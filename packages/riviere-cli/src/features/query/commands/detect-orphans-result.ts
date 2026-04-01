import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role command-use-case-result-value */
export type OrphanComponent = ReturnType<RiviereQuery['detectOrphans']>[number]

/** @riviere-role command-use-case-result */
export interface DetectOrphansResult {
  orphans: OrphanComponent[]
}
