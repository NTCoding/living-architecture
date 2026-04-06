import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { ValidateGraphInput } from './validate-graph-input'
import type {
  ValidateGraphErrorCode, ValidateGraphResult 
} from './validate-graph-result'

/** @riviere-role command-use-case */
export class ValidateGraph {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: ValidateGraphInput): ValidateGraphResult {
    try {
      const builder = this.repository.load(input.graphPathOption)
      const validationResult = builder.validate()
      return {
        errors: validationResult.errors,
        success: true,
        valid: validationResult.valid,
        warnings: builder.warnings(),
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        return failure('GRAPH_NOT_FOUND', error.message)
      }
      if (error instanceof GraphCorruptedError) {
        return failure('GRAPH_CORRUPTED', 'Graph file contains invalid JSON')
      }
      throw error
    }
  }
}

function failure(code: ValidateGraphErrorCode, message: string): ValidateGraphResult {
  return {
    code,
    message,
    success: false,
  }
}
