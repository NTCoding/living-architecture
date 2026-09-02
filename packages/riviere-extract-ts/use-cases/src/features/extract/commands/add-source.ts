import { GraphCorruptedError } from '../data-access/riviere-project/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-project/graph-not-found-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { AddSourceInput } from './add-source-input'
import type { AddSourceErrorCode, AddSourceResult } from './add-source-result'

/** @riviere-role command-use-case */
export class AddSource {
  constructor(private readonly repository: RiviereProjectRepository) {}

  execute(input: AddSourceInput): AddSourceResult {
    try {
      const project = this.repository.loadByGraphPath(input.graphFileLocation)
      project.addSource({ repository: input.repository })
      this.repository.save(input.graphFileLocation, project)
      return {
        result: {
          repository: input.repository,
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

function failure(code: AddSourceErrorCode, message: string): AddSourceResult {
  return {
    result: {
      code,
      message,
      success: false,
    },
  }
}
