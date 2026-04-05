/** @riviere-role command-use-case-result-value */
export type AddDomainErrorCode = 'DUPLICATE_DOMAIN' | 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export type AddDomainResult =
  | {
    description: string
    name: string
    success: true
    systemType: string
  }
  | {
    code: AddDomainErrorCode
    message: string
    success: false
  }
