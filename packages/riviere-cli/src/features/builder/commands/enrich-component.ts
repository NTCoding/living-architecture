import {
  ComponentNotFoundError,
  InvalidEnrichmentTargetError,
} from '@living-architecture/riviere-builder'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { EnrichComponentInput } from './enrich-component-input'
import type { EnrichComponentResult } from './enrich-component-result'

/** @riviere-role command-use-case */
export async function enrichComponent(input: EnrichComponentInput): Promise<EnrichComponentResult> {
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
      suggestions: [],
    }
  }

  try {
    loadedGraph.builder.enrichComponent(input.id, {
      ...(input.businessRules.length > 0 ? { businessRules: input.businessRules } : {}),
      ...(input.entity !== undefined ? { entity: input.entity } : {}),
      ...(input.stateChanges.length > 0 ? { stateChanges: input.stateChanges } : {}),
      ...buildBehavior(input),
      ...(input.signature !== undefined ? { signature: input.signature } : {}),
    })
    await repository.save(loadedGraph.builder, input.graphPathOption)
    return {
      componentId: input.id,
      success: true,
    }
  } catch (error) {
    if (error instanceof InvalidEnrichmentTargetError) {
      return {
        code: 'INVALID_COMPONENT_TYPE',
        message: error.message,
        suggestions: [],
        success: false,
      }
    }

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

function buildBehavior(input: EnrichComponentInput): { behavior: object } | Record<string, never> {
  const hasBehavior =
    input.reads.length > 0 ||
    input.validates.length > 0 ||
    input.modifies.length > 0 ||
    input.emits.length > 0

  if (!hasBehavior) {
    return {}
  }

  return {
    behavior: {
      ...(input.reads.length > 0 ? { reads: input.reads } : {}),
      ...(input.validates.length > 0 ? { validates: input.validates } : {}),
      ...(input.modifies.length > 0 ? { modifies: input.modifies } : {}),
      ...(input.emits.length > 0 ? { emits: input.emits } : {}),
    },
  }
}
