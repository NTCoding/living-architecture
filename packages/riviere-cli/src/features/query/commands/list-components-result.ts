import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role command-use-case-result-value */
export type ListedComponent = ReturnType<RiviereQuery['components']>[number]

/** @riviere-role command-use-case-result */
export interface ListComponentsResult {
  components: ListedComponent[]
}
