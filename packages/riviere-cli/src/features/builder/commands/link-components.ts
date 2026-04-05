import { ComponentNotFoundError } from '@living-architecture/riviere-builder'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { LinkComponentsInput } from './link-components-input'
import type { LinkComponentsResult } from './link-components-result'

/** @riviere-role command-use-case */
export function linkComponents(input: LinkComponentsInput): LinkComponentsResult {
  const repository = new RiviereBuilderRepository()
  const loadedGraph = repository.load(input.graphPathOption)
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
    const linkInput: {
      from: string
      to: string
      type?: 'sync' | 'async'
    } = {
      from: input.from,
      to: input.to,
    }
    if (input.type !== undefined) {
      linkInput.type = input.type
    }

    const link = loadedGraph.builder.link(linkInput)
    repository.save(loadedGraph.builder, input.graphPathOption)
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
