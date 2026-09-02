import { GraphCorruptedError } from '../data-access/riviere-project/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-project/graph-not-found-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { FinalizeGraphInput } from './finalize-graph-input'
import type { FinalizeGraphErrorCode, FinalizeGraphResult } from './finalize-graph-result'

/** @riviere-role command-use-case */
export class FinalizeGraph {
  constructor(private readonly repository: RiviereProjectRepository) {}

  execute(input: FinalizeGraphInput): FinalizeGraphResult {
    try {
      const project = this.repository.loadByGraphPath(input.graphFileLocation)
      const validationResult = project.validate()
      if (!validationResult.valid) {
        return failure(
          'VALIDATION_ERROR',
          `Validation failed: ${validationResult.errors.map((e) => e.message).join('; ')}`,
        )
      }
      return {
        result: {
          finalGraph: project.build(),
          outputPath: input.outputPath,
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
      throw error
    }
  }
}

function failure(code: FinalizeGraphErrorCode, message: string): FinalizeGraphResult {
  return {
    result: {
      code,
      message,
      success: false,
    },
  }
}
