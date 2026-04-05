import type { RiviereBuilder } from '@living-architecture/riviere-builder'

/** @riviere-role command-use-case-result-value */
export type ValidationData = ReturnType<RiviereBuilder['validate']>

/** @riviere-role command-use-case-result-value */
export type ValidateGraphErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export type ValidateGraphResult =
  | {
    errors: ValidationData['errors']
    success: true
    valid: boolean
    warnings: ReturnType<RiviereBuilder['warnings']>
  }
  | {
    code: ValidateGraphErrorCode
    message: string
    success: false
  }
