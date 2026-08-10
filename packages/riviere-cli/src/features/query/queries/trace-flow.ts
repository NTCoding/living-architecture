import {
  findNearMatches, ComponentId 
} from '@living-architecture/riviere-builder'
import {
  ComponentNotFoundError, parseComponentId 
} from '@living-architecture/riviere-query'
import { RiviereQueryRepository } from '../data-access/riviere-query-repository'
import type { TraceFlowInput } from './trace-flow-input'
import type { TraceFlowResult } from './trace-flow-result'
import { loadQueryGraph } from './query-graph-load-failure'

/** @riviere-role query-model-use-case */
export class TraceFlow {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: TraceFlowInput): TraceFlowResult {
    const loaded = loadQueryGraph(this.repository, input.graphPathOption)
    if (loaded.kind !== 'loaded') {
      return loaded
    }

    try {
      const componentId = parseComponentId(input.componentId)
      return {
        flow: loaded.query.traceFlow(componentId),
        success: true,
      }
    } catch (error) {
      if (!(error instanceof ComponentNotFoundError)) {
        throw error
      }

      const parsedId = ComponentId.parse(input.componentId)
      const matches = findNearMatches(
        loaded.query.components(),
        { name: parsedId.name() },
        { limit: 3 },
      )

      return {
        message: error.message,
        success: false,
        suggestions: matches.map((match) => match.component.id),
      }
    }
  }
}
