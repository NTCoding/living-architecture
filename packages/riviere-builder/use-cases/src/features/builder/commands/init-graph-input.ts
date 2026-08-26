/** @riviere-role command-use-case-input */
export interface InitDomainInput {
  description: string
  name: string
  systemType: string
}

/** @riviere-role command-use-case-input */
export interface InitGraphInput {
  domains: InitDomainInput[]
  graphFileLocation: string
  name: string | undefined
  sources: string[]
}
