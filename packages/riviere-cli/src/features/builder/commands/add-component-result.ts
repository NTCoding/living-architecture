/** @riviere-role command-use-case-result-value */
export type AddComponentErrorCode =
  | 'VALIDATION_ERROR'
  | 'GRAPH_NOT_FOUND'
  | 'DOMAIN_NOT_FOUND'
  | 'CUSTOM_TYPE_NOT_FOUND'
  | 'DUPLICATE_COMPONENT'

/** @riviere-role command-use-case-result */
export type AddComponentResult =
  | {
    success: true
    componentId: string
  }
  | {
    success: false
    code: AddComponentErrorCode
    message: string
  }
