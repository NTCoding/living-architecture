type ValidationErrorCode =
  | 'INVALID_LINK_SOURCE'
  | 'INVALID_LINK_TARGET'
  | 'INVALID_TYPE'
  | 'INVALID_RELATIONSHIP_TYPE'
  | 'DUPLICATE_LINK_ID'
  | 'DUPLICATE_LINK'

/** @riviere-role value-object */
export class ValidationError {
  declare private readonly brand: 'ValidationError'
  readonly path: string
  readonly message: string
  readonly code: ValidationErrorCode

  private constructor(input: {
    readonly path: string
    readonly message: string
    readonly code: ValidationErrorCode
  }) {
    this.path = input.path
    this.message = input.message
    this.code = input.code
  }

  static parse(input: {
    readonly path: string
    readonly message: string
    readonly code: ValidationErrorCode
  }): ValidationError {
    return new ValidationError(input)
  }
}
