/** @riviere-role command-use-case-result-value */
export type AddComponentErrorCode =
  | 'VALIDATION_ERROR'
  | 'GRAPH_NOT_FOUND'
  | 'DOMAIN_NOT_FOUND'
  | 'CUSTOM_TYPE_NOT_FOUND'
  | 'DUPLICATE_COMPONENT'

/** @riviere-role command-use-case-result */
export interface AddComponentResult {
  readonly result:
    | {
        readonly success: true
        readonly componentId: string
      }
    | {
        readonly success: false
        readonly code: AddComponentErrorCode
        readonly message: string
      }
}
