import {
  DuplicateDomainError,
  SystemType,
} from '@living-architecture/riviere-builder-published-language'
import { GraphCorruptedError } from '../data-access/riviere-project/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-project/graph-not-found-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { AddDomainInput } from './add-domain-input'
import type { AddDomainErrorCode, AddDomainResult } from './add-domain-result'

/** @riviere-role command-use-case */
export class AddDomain {
  constructor(private readonly repository: RiviereProjectRepository) {}

  execute(input: AddDomainInput): AddDomainResult {
    const systemType = SystemType.parse(input.systemType)
    if (!systemType.success) {
      return failure('VALIDATION_ERROR', `Invalid system type: ${input.systemType}`)
    }

    try {
      const project = this.repository.loadByGraphPath(input.graphFileLocation)
      project.addDomain({
        description: input.description,
        name: input.name,
        systemType: systemType.data.value,
      })
      this.repository.save(input.graphFileLocation, project)
      return {
        result: {
          description: input.description,
          name: input.name,
          success: true,
          systemType: systemType.data.value,
        },
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        return failure('GRAPH_NOT_FOUND', error.message)
      }
      if (error instanceof GraphCorruptedError) {
        return failure('GRAPH_CORRUPTED', 'Graph file contains invalid JSON')
      }
      if (error instanceof DuplicateDomainError) {
        return failure('DUPLICATE_DOMAIN', error.message)
      }
      throw error
    }
  }
}

function failure(code: AddDomainErrorCode, message: string): AddDomainResult {
  return {
    result: {
      code,
      message,
      success: false,
    },
  }
}
