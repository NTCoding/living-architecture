import {
  findNearMatches, ComponentId 
} from '@living-architecture/riviere-builder'
import {
  ComponentNotFoundError, parseComponentId 
} from '@living-architecture/riviere-query'
import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { TraceFlowInput } from './trace-flow-input'
import type { TraceFlowResult } from './trace-flow-result'

/** @riviere-role command-use-case */
export function traceFlow(input: TraceFlowInput): TraceFlowResult {
  const repository = new RiviereQueryRepository()
  const query = repository.load(input.graphPathOption)

  try {
    const componentId = parseComponentId(input.componentId)
    return {
      flow: query.traceFlow(componentId),
      success: true,
    }
  } catch (error) {
    if (!(error instanceof ComponentNotFoundError)) {
      throw error
    }

    const parsedId = ComponentId.parse(input.componentId)
    const matches = findNearMatches(query.components(), { name: parsedId.name() }, { limit: 3 })

    return {
      message: error.message,
      success: false,
      suggestions: matches.map((match) => match.component.id),
    }
  }
}
