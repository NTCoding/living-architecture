import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role query-use-case-result-value */
export type ListedComponent = ReturnType<RiviereQuery['components']>[number]

/** @riviere-role query-use-case-result */
export interface ListComponentsResult {components: ListedComponent[]}
