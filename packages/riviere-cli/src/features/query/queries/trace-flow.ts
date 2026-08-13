import { FlowTraceLoader } from '../data-access/graph/query-loaders'
import type { TraceFlowInput } from './trace-flow-input'
import type { TraceFlowResult } from './trace-flow-result'
import { toQueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class TraceFlow {
  constructor(private readonly flowTrace: FlowTraceLoader) {}

  execute(input: TraceFlowInput): TraceFlowResult {
    try {
      return this.flowTrace.load(input.graphPathOption, input.componentId)
    } catch (error) {
      const failure = toQueryGraphLoadFailure(error)
      if (failure !== undefined) {
        return failure
      }
      throw error
    }
  }
}
