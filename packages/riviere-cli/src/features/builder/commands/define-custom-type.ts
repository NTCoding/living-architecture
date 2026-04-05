import { CustomTypeAlreadyDefinedError } from '@living-architecture/riviere-builder'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { DefineCustomTypeInput } from './define-custom-type-input'
import type { DefineCustomTypeResult } from './define-custom-type-result'

/** @riviere-role command-use-case */
export function defineCustomType(input: DefineCustomTypeInput): DefineCustomTypeResult {
  const repository = new RiviereBuilderRepository()
  const loadedGraph = repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    return {
      code: loadedGraph.code,
      /* v8 ignore next -- simple graph-load message selection */
      message:
        loadedGraph.code === 'GRAPH_NOT_FOUND'
          ? `Graph not found at ${loadedGraph.graphPath}`
          : 'Graph file contains invalid JSON',
      success: false,
    }
  }

  try {
    loadedGraph.builder.defineCustomType({
      ...(input.description !== undefined && { description: input.description }),
      name: input.name,
      ...(Object.keys(input.optionalProperties).length > 0
        ? { optionalProperties: input.optionalProperties }
        : {}),
      ...(Object.keys(input.requiredProperties).length > 0
        ? { requiredProperties: input.requiredProperties }
        : {}),
    })
    repository.save(loadedGraph.builder, input.graphPathOption)
    return {
      description: input.description,
      name: input.name,
      optionalProperties: input.optionalProperties,
      requiredProperties: input.requiredProperties,
      success: true,
    }
  } catch (error) {
    if (error instanceof CustomTypeAlreadyDefinedError) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message,
        success: false,
      }
    }

    throw error
  }
}
