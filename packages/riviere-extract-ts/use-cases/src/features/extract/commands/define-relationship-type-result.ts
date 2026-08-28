/** @riviere-role command-use-case-result-value */
export type DefineRelationshipTypeErrorCode =
  | 'GRAPH_CORRUPTED'
  | 'GRAPH_NOT_FOUND'
  | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result */
export interface DefineRelationshipTypeResult {
  readonly result:
    | {
        readonly description: string
        readonly name: string
        readonly success: true
      }
    | {
        readonly code: DefineRelationshipTypeErrorCode
        readonly message: string
        readonly success: false
      }
}
