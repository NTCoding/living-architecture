import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { CheckConsistencyInput } from './check-consistency-input'
import type { CheckConsistencyResult } from './check-consistency-result'

/** @riviere-role command-use-case */
export async function checkConsistency(
  input: CheckConsistencyInput,
): Promise<CheckConsistencyResult> {
  const repository = new RiviereBuilderRepository()
  const loadedGraph = await repository.load(input.graphPathOption)
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

  const warnings = loadedGraph.builder.warnings()
  return {
    consistent: warnings.length === 0,
    success: true,
    warnings,
  }
}
