import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role query-use-case-result-value */
export type SearchComponent = ReturnType<RiviereQuery['search']>[number]

/** @riviere-role query-use-case-result */
export interface SearchComponentsResult {components: SearchComponent[]}
