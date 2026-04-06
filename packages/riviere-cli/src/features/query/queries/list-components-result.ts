import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role query-model */
export type ListedComponent = ReturnType<RiviereQuery['components']>[number]

/** @riviere-role query-model */
export interface ListComponentsResult {components: ListedComponent[]}
