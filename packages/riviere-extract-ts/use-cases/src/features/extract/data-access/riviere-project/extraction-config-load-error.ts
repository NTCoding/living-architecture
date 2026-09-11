import type { ValidationError } from '@living-architecture/riviere-extract-config-published-language'
import { ExtractionConfigError } from './riviere-config-error'

/** @riviere-role data-access-error */
export class InvalidExtractionConfigError extends ExtractionConfigError {
  constructor(readonly errors: readonly ValidationError[]) {
    super('VALIDATION_ERROR', formatValidationErrors(errors))
    this.name = 'InvalidExtractionConfigError'
  }
}

function formatValidationErrors(errors: readonly ValidationError[]): string {
  if (errors.length === 0) return 'validation failed without specific errors'
  return errors.map((error) => `${error.path}: ${error.message}`).join('\n')
}
