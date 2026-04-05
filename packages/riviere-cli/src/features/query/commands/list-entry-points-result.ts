import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role command-use-case-result-value */
export type EntryPointComponent = ReturnType<RiviereQuery['entryPoints']>[number]

/** @riviere-role command-use-case-result */
export interface ListEntryPointsResult {entryPoints: EntryPointComponent[]}
