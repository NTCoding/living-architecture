/** @riviere-role command-use-case-result-value */
export type InitGraphErrorCode = 'GRAPH_EXISTS' | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result */
export interface InitGraphResult {
  readonly result:
    | {
        readonly domains: string[]
        readonly path: string
        readonly sources: number
        readonly success: true
      }
    | {
        readonly code: InitGraphErrorCode
        readonly message: string
        readonly path?: string
        readonly success: false
      }
}
