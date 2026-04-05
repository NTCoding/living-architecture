import type { RiviereQuery } from '@living-architecture/riviere-query'

/** @riviere-role query-use-case-result-value */
export type TraceFlowGraph = ReturnType<RiviereQuery['traceFlow']>

/** @riviere-role query-use-case-result */
export type TraceFlowResult =
  | {
    flow: TraceFlowGraph
    success: true
  }
  | {
    message: string
    suggestions: string[]
    success: false
  }
