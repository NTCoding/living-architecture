import { GraphCorruptedError } from '../data-access/riviere-project/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-project/graph-not-found-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { ValidateGraphInput } from './validate-graph-input'
import type { ValidateGraphErrorCode, ValidateGraphResult } from './validate-graph-result'

/** @riviere-role command-use-case */
export class ValidateGraph {
  constructor(private readonly repository: RiviereProjectRepository) {}

  execute(input: ValidateGraphInput): ValidateGraphResult {
    try {
      const project = this.repository.loadByGraphPath(input.graphFileLocation)
      const validationResult = project.validate()
      return {
        result: {
          errors: validationResult.errors,
          success: true,
          valid: validationResult.valid,
          warnings: project.warnings(),
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

function failure(code: ValidateGraphErrorCode, message: string): ValidateGraphResult {
  return {
    result: {
      code,
      message,
      success: false,
    },
  }
}
