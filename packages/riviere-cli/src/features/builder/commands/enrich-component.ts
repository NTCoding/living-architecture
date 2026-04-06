import {
  ComponentNotFoundError,
  InvalidEnrichmentTargetError,
} from '@living-architecture/riviere-builder'
import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { EnrichComponentInput } from './enrich-component-input'
import type {
  EnrichComponentErrorCode, EnrichComponentResult 
} from './enrich-component-result'

/** @riviere-role command-use-case */
export class EnrichComponent {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: EnrichComponentInput): EnrichComponentResult {
    try {
      const builder = this.repository.load(input.graphPathOption)
      const enrichmentInput: Parameters<typeof builder.enrichComponent>[1] = {
        ...buildBehavior(input),
        ...(input.businessRules.length > 0 ? { businessRules: input.businessRules } : {}),
        ...(input.stateChanges.length > 0 ? { stateChanges: input.stateChanges } : {}),
      }
      if (input.entity !== undefined) {
        enrichmentInput.entity = input.entity
      }
      if (input.signature !== undefined) {
        enrichmentInput.signature = input.signature
      }
      builder.enrichComponent(input.id, enrichmentInput)
      this.repository.save(builder)
      return {
        componentId: input.id,
        success: true,
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        return failure('GRAPH_NOT_FOUND', error.message)
      }
      if (error instanceof GraphCorruptedError) {
        return failure('GRAPH_CORRUPTED', 'Graph file contains invalid JSON')
      }
      if (error instanceof InvalidEnrichmentTargetError) {
        return failure('INVALID_COMPONENT_TYPE', error.message)
      }
      if (error instanceof ComponentNotFoundError) {
        return failure('COMPONENT_NOT_FOUND', error.message, error.suggestions)
      }
      throw error
    }
  }
}

function failure(
  code: EnrichComponentErrorCode,
  message: string,
  suggestions: string[] = [],
): EnrichComponentResult {
  return {
    code,
    message,
    suggestions,
    success: false,
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
      /* v8 ignore next -- symmetric conditional branch */
      ...(input.validates.length > 0 ? { validates: input.validates } : {}),
      ...(input.modifies.length > 0 ? { modifies: input.modifies } : {}),
      ...(input.emits.length > 0 ? { emits: input.emits } : {}),
    },
  }
}
