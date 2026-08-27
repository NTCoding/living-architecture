import { GraphCorruptedError } from '../data-access/riviere-builder/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-builder/graph-not-found-error'
import { RiviereBuilderRepository } from '../data-access/riviere-builder/riviere-builder-repository'
import type { CheckConsistencyInput } from './check-consistency-input'
import type { CheckConsistencyErrorCode, CheckConsistencyResult } from './check-consistency-result'

/** @riviere-role command-use-case */
export class CheckConsistency {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: CheckConsistencyInput): CheckConsistencyResult {
    try {
      const builder = this.repository.load(input.graphFileLocation)
      const warnings = builder.warnings()
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
