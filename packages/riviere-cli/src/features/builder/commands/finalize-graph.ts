import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { FinalizeGraphInput } from './finalize-graph-input'
import type { FinalizeGraphResult } from './finalize-graph-result'

/** @riviere-role command-use-case */
export function finalizeGraph(input: FinalizeGraphInput): FinalizeGraphResult {
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

  const validationResult = loadedGraph.builder.validate()
  if (!validationResult.valid) {
    return {
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${validationResult.errors.map((error) => error.message).join('; ')}`,
      success: false,
    }
  }

  return {
    finalGraph: loadedGraph.builder.build(),
    success: true,
  }
}
