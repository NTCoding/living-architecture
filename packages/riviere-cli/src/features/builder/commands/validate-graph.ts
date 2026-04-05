import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { ValidateGraphInput } from './validate-graph-input'
import type { ValidateGraphResult } from './validate-graph-result'

/** @riviere-role command-use-case */
export function validateGraph(input: ValidateGraphInput): ValidateGraphResult {
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
  return {
    errors: validationResult.errors,
    success: true,
    valid: validationResult.valid,
    warnings: loadedGraph.builder.warnings(),
  }
}
