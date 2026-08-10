/** @riviere-role command-use-case-result-value */
export type DefineRelationshipTypeErrorCode =
  | 'GRAPH_CORRUPTED'
  | 'GRAPH_NOT_FOUND'
  | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result */
export type DefineRelationshipTypeResult =
  | {
    description: string
    name: string
    success: true
  }
  | {
    code: DefineRelationshipTypeErrorCode
    message: string
    success: false
  }
