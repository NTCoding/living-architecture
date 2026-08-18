/** @riviere-role command-use-case-result-value */
export type AddDomainErrorCode =
  | 'DUPLICATE_DOMAIN'
  | 'GRAPH_CORRUPTED'
  | 'GRAPH_NOT_FOUND'
  | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result */
export interface AddDomainResult {
  readonly result:
    | {
        readonly description: string
        readonly name: string
        readonly success: true
        readonly systemType: string
      }
    | {
        readonly code: AddDomainErrorCode
        readonly message: string
        readonly success: false
      }
}
