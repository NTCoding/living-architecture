import type { RiviereQuery } from '@living-architecture/riviere-query'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model */
export type TraceFlowGraph = ReturnType<RiviereQuery['traceFlow']>

/** @riviere-role query-model */
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
  | QueryGraphLoadFailure
