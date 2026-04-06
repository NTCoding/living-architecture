import { CustomTypeAlreadyDefinedError } from '@living-architecture/riviere-builder'
import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { DefineCustomTypeInput } from './define-custom-type-input'
import type {
  DefineCustomTypeErrorCode, DefineCustomTypeResult 
} from './define-custom-type-result'

/** @riviere-role command-use-case */
export class DefineCustomType {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: DefineCustomTypeInput): DefineCustomTypeResult {
    try {
      const builder = this.repository.load(input.graphPathOption)
      builder.defineCustomType({
        ...(input.description !== undefined && { description: input.description }),
        name: input.name,
        ...(Object.keys(input.optionalProperties).length > 0
          ? { optionalProperties: input.optionalProperties }
          : {}),
        ...(Object.keys(input.requiredProperties).length > 0
          ? { requiredProperties: input.requiredProperties }
          : {}),
      })
      this.repository.save(builder)
      return {
        description: input.description,
        name: input.name,
        optionalProperties: input.optionalProperties,
        requiredProperties: input.requiredProperties,
        success: true,
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        return failure('GRAPH_NOT_FOUND', error.message)
      }
      if (error instanceof GraphCorruptedError) {
        return failure('GRAPH_CORRUPTED', 'Graph file contains invalid JSON')
      }
      if (error instanceof CustomTypeAlreadyDefinedError) {
        return failure('VALIDATION_ERROR', error.message)
      }
      throw error
    }
  }
}

function failure(code: DefineCustomTypeErrorCode, message: string): DefineCustomTypeResult {
  return {
    code,
    message,
    success: false,
  }
}
