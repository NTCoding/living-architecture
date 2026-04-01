import { findNearMatches, ComponentId } from '@living-architecture/riviere-builder'
import { ComponentNotFoundError, parseComponentId } from '@living-architecture/riviere-query'
import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import type { TraceFlowInput } from './trace-flow-input'
import type { TraceFlowResult } from './trace-flow-result'

/** @riviere-role command-use-case */
export async function traceFlow(input: TraceFlowInput): Promise<TraceFlowResult> {
  const repository = new RiviereQueryRepository()
  const loadedGraph = await repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    throw new Error(`Failed to load graph at ${loadedGraph.graphPath}`)
  }

  try {
    const componentId = parseComponentId(input.componentId)
    return {
      flow: loadedGraph.query.traceFlow(componentId),
      success: true,
    }
  } catch (error) {
    if (!(error instanceof ComponentNotFoundError)) {
      throw error
    }

    const parsedId = ComponentId.parse(input.componentId)
    const matches = findNearMatches(
      loadedGraph.query.components(),
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
