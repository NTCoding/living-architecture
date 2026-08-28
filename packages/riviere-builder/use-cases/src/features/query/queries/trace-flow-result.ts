import { ComponentId as QueryComponentId } from '@living-architecture/riviere-builder-domain-model/query/component-id'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import {
  ComponentNotFoundError,
  RiviereQuery,
} from '@living-architecture/riviere-builder-domain-model/query'
import type { QueryGraphLoadFailure } from './query-graph-load-failure'

/** @riviere-role query-model-value */
export type TraceFlowGraph = ReturnType<RiviereQuery['traceFlow']>

/** @riviere-role query-model */
export class FoundFlowTrace {
  readonly success = true

  private constructor(readonly flow: TraceFlowGraph) {}

  static parse(graph: unknown, componentIdInput: string): FlowTrace {
    const query = RiviereQuery.fromJSON(graph)
    try {
      return new FoundFlowTrace(query.traceFlow(QueryComponentId.parse(componentIdInput)))
    } catch (error) {
      if (!(error instanceof ComponentNotFoundError)) throw error

      const parsedComponentId = ComponentId.parse(componentIdInput)
      if (!parsedComponentId.success) {
        return MissingFlowTrace.parse(error.message, [])
      }
      const matches = query.nearMatches(
        { name: parsedComponentId.componentId.name() },
        { limit: 3 },
      )
      return MissingFlowTrace.parse(
        error.message,
        matches.map((match) => match.component.id),
      )
    }
  }
}

class MissingFlowTrace {
  readonly success = false

  private constructor(
    readonly message: string,
    readonly suggestions: string[],
  ) {}

  static parse(message: string, suggestions: string[]): MissingFlowTrace {
    return new MissingFlowTrace(message, suggestions)
  }
}

/** @riviere-role query-model-value */
export type FlowTrace = FoundFlowTrace | MissingFlowTrace

/** @riviere-role query-model-value */
export type TraceFlowResult = FlowTrace | QueryGraphLoadFailure
