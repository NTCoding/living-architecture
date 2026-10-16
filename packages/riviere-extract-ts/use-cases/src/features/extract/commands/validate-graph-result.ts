import type { GraphWarning } from '@living-architecture/riviere-builder-published-language'
import type { ValidationResult } from '@living-architecture/riviere-schema-published-language/graph-validation'

/** @riviere-role command-use-case-result-value */
export type ValidationData = ValidationResult

/** @riviere-role command-use-case-result-value */
export type ValidateGraphErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export interface ValidateGraphResult {
  readonly result:
    | {
        readonly errors: ValidationData['errors']
        readonly success: true
        readonly valid: boolean
        readonly warnings: readonly GraphWarning[]
      }
    | {
        readonly code: ValidateGraphErrorCode
        readonly message: string
        readonly success: false
      }
}
