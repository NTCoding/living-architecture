import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { FinalizeGraphInput } from './finalize-graph-input'
import type {
  FinalizeGraphErrorCode, FinalizeGraphResult 
} from './finalize-graph-result'

/** @riviere-role command-use-case */
export class FinalizeGraph {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: FinalizeGraphInput): FinalizeGraphResult {
    try {
      const builder = this.repository.load(input.graphPathOption)
      const validationResult = builder.validate()
      if (!validationResult.valid) {
        return failure(
          'VALIDATION_ERROR',
          `Validation failed: ${validationResult.errors.map((e) => e.message).join('; ')}`,
        )
      }
      return {
        finalGraph: builder.build(),
        success: true,
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

function failure(code: FinalizeGraphErrorCode, message: string): FinalizeGraphResult {
  return {
    code,
    message,
    success: false,
  }
}
