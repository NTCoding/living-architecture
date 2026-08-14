/** @riviere-role command-use-case-input */
export interface InitDomainInput {
  description: string
  name: string
  systemType: string
}

/** @riviere-role command-use-case-input */
export interface InitGraphInput {
  domains: InitDomainInput[]
  graphPathOption: string | undefined
  name: string | undefined
  sources: string[]
}
