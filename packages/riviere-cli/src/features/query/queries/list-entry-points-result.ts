import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role query-use-case-result-value */
export type EntryPointComponent = ReturnType<RiviereQuery['entryPoints']>[number]

/** @riviere-role query-use-case-result */
export interface ListEntryPointsResult {entryPoints: EntryPointComponent[]}
