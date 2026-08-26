import type { RiviereBuilder } from '@living-architecture/riviere-builder-domain-model/domain/riviere-builder'

/** @riviere-role command-use-case-result-value */
export type CheckConsistencyErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result-value */
export type BuilderWarnings = ReturnType<RiviereBuilder['warnings']>

/** @riviere-role command-use-case-result */
export interface CheckConsistencyResult {
  readonly result:
    | {
        readonly consistent: boolean
        readonly success: true
        readonly warnings: BuilderWarnings
      }
    | {
        readonly code: CheckConsistencyErrorCode
        readonly message: string
        readonly success: false
      }
}
