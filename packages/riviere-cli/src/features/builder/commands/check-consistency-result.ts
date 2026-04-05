import type { RiviereBuilder } from '@living-architecture/riviere-builder'

/** @riviere-role command-use-case-result-value */
export type CheckConsistencyErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result-value */
export type BuilderWarnings = ReturnType<RiviereBuilder['warnings']>

/** @riviere-role command-use-case-result */
export type CheckConsistencyResult =
  | {
    consistent: boolean
    success: true
    warnings: BuilderWarnings
  }
  | {
    code: CheckConsistencyErrorCode
    message: string
    success: false
  }
