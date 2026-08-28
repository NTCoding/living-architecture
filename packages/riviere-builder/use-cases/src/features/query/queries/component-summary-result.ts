import { RiviereQuery } from '@living-architecture/riviere-builder-domain-model/query'
import type { ComponentSummaryStats } from '@living-architecture/riviere-builder-domain-model/query/component-summary-stats'

/** @riviere-role query-model-value */
export type ComponentSummaryErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

type ComponentSummaryResultValue =
  | { readonly success: true; readonly stats: ComponentSummaryStats }
  | {
      readonly code: ComponentSummaryErrorCode
      readonly message: string
      readonly success: false
    }

/** @riviere-role query-model */
export class ComponentSummaryResult {
  private constructor(readonly result: ComponentSummaryResultValue) {}

  static fromGraph(graph: unknown): ComponentSummaryResult {
    return new ComponentSummaryResult({
      stats: RiviereQuery.fromJSON(graph).componentSummary(),
      success: true,
    })
  }

  static failure(code: ComponentSummaryErrorCode, message: string): ComponentSummaryResult {
    return new ComponentSummaryResult({ code, message, success: false })
  }
}
