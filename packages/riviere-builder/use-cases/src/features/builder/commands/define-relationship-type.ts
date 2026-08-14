import { RelationshipTypeAlreadyDefinedError } from '@living-architecture/riviere-builder-domain-model/domain/construction/construction-errors'
import { GraphCorruptedError } from '../data-access/riviere-builder/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-builder/graph-not-found-error'
import { RiviereBuilderRepository } from '../data-access/riviere-builder/riviere-builder-repository'
import type { DefineRelationshipTypeInput } from './define-relationship-type-input'
import type {
  DefineRelationshipTypeErrorCode,
  DefineRelationshipTypeResult,
} from './define-relationship-type-result'

/** @riviere-role command-use-case */
export class DefineRelationshipType {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: DefineRelationshipTypeInput): DefineRelationshipTypeResult {
    try {
      const builder = this.repository.load(input.graphPathOption)
      builder.defineRelationshipType({
        name: input.name,
        description: input.description,
      })
      this.repository.save(builder)
      return {
        description: input.description,
        name: input.name,
        success: true,
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        return failure('GRAPH_NOT_FOUND', error.message)
      }
      if (error instanceof GraphCorruptedError) {
        return failure('GRAPH_CORRUPTED', 'Graph file contains invalid JSON')
      }
      if (error instanceof RelationshipTypeAlreadyDefinedError) {
        return failure('VALIDATION_ERROR', error.message)
      }
      throw error
    }
  }
}

function failure(
  code: DefineRelationshipTypeErrorCode,
  message: string,
): DefineRelationshipTypeResult {
  return {
    code,
    message,
    success: false,
  }
}
