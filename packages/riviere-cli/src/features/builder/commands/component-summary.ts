import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { ComponentSummaryInput } from './component-summary-input'
import type { ComponentSummaryResult } from './component-summary-result'

/** @riviere-role command-use-case */
export function componentSummary(input: ComponentSummaryInput): ComponentSummaryResult {
  const repository = new RiviereBuilderRepository()
  const loadedGraph = repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    return {
      code: loadedGraph.code,
      message:
        loadedGraph.code === 'GRAPH_NOT_FOUND'
          ? `Graph not found at ${loadedGraph.graphPath}`
          : 'Graph file contains invalid JSON',
      success: false,
    }
  }

  return {
    ...loadedGraph.builder.stats(),
    success: true,
  }
}
