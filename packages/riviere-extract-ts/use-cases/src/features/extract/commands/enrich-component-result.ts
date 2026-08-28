/** @riviere-role command-use-case-result-value */
export type EnrichComponentErrorCode =
  | 'COMPONENT_NOT_FOUND'
  | 'GRAPH_CORRUPTED'
  | 'GRAPH_NOT_FOUND'
  | 'INVALID_COMPONENT_TYPE'

/** @riviere-role command-use-case-result */
export interface EnrichComponentResult {
  readonly result:
    | {
        readonly componentId: string
        readonly success: true
      }
    | {
        readonly code: EnrichComponentErrorCode
        readonly message: string
        readonly suggestions: string[]
        readonly success: false
      }
}
