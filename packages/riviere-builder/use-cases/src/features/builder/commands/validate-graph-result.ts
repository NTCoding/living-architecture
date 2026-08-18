import type { RiviereBuilder } from '@living-architecture/riviere-builder-domain-model/domain/builder-facade'

/** @riviere-role command-use-case-result-value */
export type ValidationData = ReturnType<RiviereBuilder['validate']>

/** @riviere-role command-use-case-result-value */
export type ValidateGraphErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export interface ValidateGraphResult {
  readonly result:
    | {
        readonly errors: ValidationData['errors']
        readonly success: true
        readonly valid: boolean
        readonly warnings: ReturnType<RiviereBuilder['warnings']>
      }
    | {
        readonly code: ValidateGraphErrorCode
        readonly message: string
        readonly success: false
      }
}
