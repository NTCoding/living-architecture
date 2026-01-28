export type ValidationErrorCode = 'INVALID_LINK_SOURCE' | 'INVALID_LINK_TARGET' | 'INVALID_TYPE'

export interface ValidationError {
  path: string
  message: string
  code: ValidationErrorCode
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}
