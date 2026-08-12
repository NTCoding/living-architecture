import { ValidationError } from './validation-error'

/** @riviere-role value-object */
export class ValidationResult {
  declare private readonly brand: 'ValidationResult'
  readonly valid: boolean
  readonly errors: ValidationError[]

  private constructor(input: {
    readonly valid: boolean;
    readonly errors: ValidationError[] 
  }) {
    this.valid = input.valid
    this.errors = input.errors
  }

  static parse(input: {
    readonly valid: boolean
    readonly errors: ValidationError[]
  }): ValidationResult {
    return new ValidationResult(input)
  }
}
