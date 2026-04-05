/** @riviere-role command-use-case-result-value */
export type AddSourceErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export type AddSourceResult =
  | {
    repository: string
    success: true
  }
  | {
    code: AddSourceErrorCode
    message: string
    success: false
  }
