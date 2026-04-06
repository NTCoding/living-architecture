import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role query-model */
export type EntryPointComponent = ReturnType<RiviereQuery['entryPoints']>[number]

/** @riviere-role query-model */
export interface ListEntryPointsResult {entryPoints: EntryPointComponent[]}
