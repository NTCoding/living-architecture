import type { SystemType } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-input */
export interface AddDomainInput {
  description: string
  graphPathOption: string | undefined
  name: string
  systemType: SystemType
}
