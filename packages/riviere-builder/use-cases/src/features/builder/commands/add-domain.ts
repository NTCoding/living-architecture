import { DuplicateDomainError } from '@living-architecture/riviere-builder-domain-model/domain/construction/construction-errors'
import { GraphCorruptedError } from '../data-access/riviere-builder/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-builder/graph-not-found-error'
import { RiviereBuilderRepository } from '../data-access/riviere-builder/riviere-builder-repository'
import { SystemType } from '@living-architecture/riviere-builder-domain-model/domain/system-type'
import type { AddDomainInput } from './add-domain-input'
import type { AddDomainErrorCode, AddDomainResult } from './add-domain-result'

/** @riviere-role command-use-case */
export class AddDomain {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: AddDomainInput): AddDomainResult {
    const systemType = SystemType.parse(input.systemType)
    if (!systemType.success) {
      return failure('VALIDATION_ERROR', `Invalid system type: ${input.systemType}`)
    }

    try {
      const builder = this.repository.load(input.graphPathOption)
      builder.addDomain({
        description: input.description,
        name: input.name,
        systemType: systemType.data.value,
      })
      this.repository.save(builder)
      return {
        description: input.description,
        name: input.name,
        success: true,
        systemType: systemType.data.value,
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
    code,
    message,
    success: false,
  }
}
