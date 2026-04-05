import type { ComponentType } from '@living-architecture/riviere-schema'

/** @riviere-role query-use-case-input */
export interface ListComponentsInput {
  domain: string | undefined
  graphPathOption: string | undefined
  type: ComponentType | undefined
}
