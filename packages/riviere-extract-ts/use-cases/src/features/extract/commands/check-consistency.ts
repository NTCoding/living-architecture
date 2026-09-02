import { GraphCorruptedError } from '../data-access/riviere-project/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-project/graph-not-found-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { CheckConsistencyInput } from './check-consistency-input'
import type { CheckConsistencyErrorCode, CheckConsistencyResult } from './check-consistency-result'

/** @riviere-role command-use-case */
export class CheckConsistency {
  constructor(private readonly repository: RiviereProjectRepository) {}

  execute(input: CheckConsistencyInput): CheckConsistencyResult {
    try {
      const project = this.repository.loadByGraphPath(input.graphFileLocation)
      const warnings = project.warnings()
      return {
        result: {
          consistent: warnings.length === 0,
          success: true,
          warnings,
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

function failure(code: CheckConsistencyErrorCode, message: string): CheckConsistencyResult {
  return {
    result: {
      code,
      message,
      success: false,
    },
  }
}
