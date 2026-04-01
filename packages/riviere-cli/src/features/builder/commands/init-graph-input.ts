import type { SystemType } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-input */
export interface InitDomainInput {
  description: string
  name: string
  systemType: SystemType
}

/** @riviere-role command-use-case-input */
export interface InitGraphInput {
  domains: InitDomainInput[]
  graphPathOption: string | undefined
  name: string | undefined
  sources: string[]
}
