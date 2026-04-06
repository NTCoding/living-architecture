import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role query-model */
export type SearchComponent = ReturnType<RiviereQuery['search']>[number]

/** @riviere-role query-model */
export interface SearchComponentsResult {components: SearchComponent[]}
