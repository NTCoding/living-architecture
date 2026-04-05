/** @riviere-role command-use-case-result-value */
export type EnrichComponentErrorCode =
  | 'COMPONENT_NOT_FOUND'
  | 'GRAPH_CORRUPTED'
  | 'GRAPH_NOT_FOUND'
  | 'INVALID_COMPONENT_TYPE'

/** @riviere-role command-use-case-result */
export type EnrichComponentResult =
  | {
    componentId: string
    success: true
  }
  | {
    code: EnrichComponentErrorCode
    message: string
    suggestions: string[]
    success: false
  }
