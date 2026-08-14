/** @riviere-role command-use-case-result-value */
export type InitGraphErrorCode = 'GRAPH_EXISTS' | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result */
export type InitGraphResult =
  | {
      domains: string[]
      path: string
      sources: number
      success: true
    }
  | {
      code: InitGraphErrorCode
      message: string
      path?: string
      success: false
    }
