import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { AddSourceInput } from './add-source-input'
import type { AddSourceResult } from './add-source-result'

/** @riviere-role command-use-case */
export function addSource(input: AddSourceInput): AddSourceResult {
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

  loadedGraph.builder.addSource({ repository: input.repository })
  repository.save(loadedGraph.builder, input.graphPathOption)
  return {
    repository: input.repository,
    success: true,
  }
}
