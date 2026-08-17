import type { ComponentSummaryStats } from '@living-architecture/riviere-builder-domain-model/domain/inspection/component-summary-stats'

/** @riviere-role command-use-case-result-value */
export type ComponentSummaryErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export type ComponentSummaryResult =
  | { readonly success: true; readonly stats: ComponentSummaryStats }
  | {
      code: ComponentSummaryErrorCode
      message: string
      success: false
    }
