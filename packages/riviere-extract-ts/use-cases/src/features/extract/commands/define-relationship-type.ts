import { RelationshipTypeAlreadyDefinedError } from '@living-architecture/riviere-builder-published-language'
import { GraphCorruptedError } from '../data-access/riviere-project/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-project/graph-not-found-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { DefineRelationshipTypeInput } from './define-relationship-type-input'
import type {
  DefineRelationshipTypeErrorCode,
  DefineRelationshipTypeResult,
} from './define-relationship-type-result'

/** @riviere-role command-use-case */
export class DefineRelationshipType {
  constructor(private readonly repository: RiviereProjectRepository) {}

  execute(input: DefineRelationshipTypeInput): DefineRelationshipTypeResult {
    try {
      const project = this.repository.loadByGraphPath(input.graphFileLocation)
      project.defineRelationshipType({
        name: input.name,
        description: input.description,
      })
      this.repository.save(input.graphFileLocation, project)
      return {
        result: {
          description: input.description,
          name: input.name,
          success: true,
        },
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
    result: {
      code,
      message,
      success: false,
    },
  }
}
