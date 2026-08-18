/** @riviere-role command-use-case-result-value */
export type AddSourceErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export interface AddSourceResult {
  readonly result:
    | {
        readonly repository: string
        readonly success: true
      }
    | {
        readonly code: AddSourceErrorCode
        readonly message: string
        readonly success: false
      }
}
