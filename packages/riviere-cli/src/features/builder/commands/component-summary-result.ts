import type { RiviereBuilder } from '@living-architecture/riviere-builder'

/** @riviere-role command-use-case-result-value */
export type ComponentSummaryStats = ReturnType<RiviereBuilder['stats']>

/** @riviere-role command-use-case-result-value */
export type ComponentSummaryErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export type ComponentSummaryResult =
  | ({ success: true } & ComponentSummaryStats)
  | {
      code: ComponentSummaryErrorCode
      message: string
      success: false
    }
