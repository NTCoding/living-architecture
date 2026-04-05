import { ComponentNotFoundError } from '@living-architecture/riviere-builder'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { LinkExternalInput } from './link-external-input'
import type { LinkExternalResult } from './link-external-result'

/** @riviere-role command-use-case */
export function linkExternal(input: LinkExternalInput): LinkExternalResult {
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
    const externalLinkInput: Parameters<typeof loadedGraph.builder.linkExternal>[0] = {
      from: input.from,
      target: input.target,
    }
    if (input.type !== undefined) {
      externalLinkInput.type = input.type
    }

    const externalLink = loadedGraph.builder.linkExternal(externalLinkInput)
    repository.save(loadedGraph.builder, input.graphPathOption)
    return {
      externalLink,
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
