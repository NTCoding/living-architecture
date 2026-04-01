import { ComponentNotFoundError } from '@living-architecture/riviere-builder'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { LinkComponentsInput } from './link-components-input'
import type { LinkComponentsResult } from './link-components-result'

/** @riviere-role command-use-case */
export async function linkComponents(input: LinkComponentsInput): Promise<LinkComponentsResult> {
  const repository = new RiviereBuilderRepository()
  const loadedGraph = await repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    return {
      code: loadedGraph.code,
      message:
        loadedGraph.code === 'GRAPH_NOT_FOUND'
          ? `Graph not found at ${loadedGraph.graphPath}`
          : 'Graph file contains invalid JSON',
      suggestions: [],
      success: false,
    }
  }

  try {
    const link = loadedGraph.builder.link({
      from: input.from,
      to: input.to,
      ...(input.type !== undefined ? { type: input.type } : {}),
    })
    await repository.save(loadedGraph.builder, input.graphPathOption)
    return {
      link,
      success: true,
    }
  } catch (error) {
    if (error instanceof ComponentNotFoundError) {
      return {
        code: 'COMPONENT_NOT_FOUND',
        message: error.message,
        suggestions: error.suggestions,
        success: false,
      }
    }

    throw error
  }
}
