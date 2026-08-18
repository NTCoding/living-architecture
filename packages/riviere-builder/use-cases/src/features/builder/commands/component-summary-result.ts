import type { ComponentSummaryStats } from '@living-architecture/riviere-builder-domain-model/domain/inspection/component-summary-stats'

/** @riviere-role command-use-case-result-value */
export type ComponentSummaryErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export interface ComponentSummaryResult {
  readonly result:
    | { readonly success: true; readonly stats: ComponentSummaryStats }
    | {
        readonly code: ComponentSummaryErrorCode
        readonly message: string
        readonly success: false
      }
}
