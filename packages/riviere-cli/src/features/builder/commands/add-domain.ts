import { DuplicateDomainError } from '@living-architecture/riviere-builder'
import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { AddDomainInput } from './add-domain-input'
import type {
  AddDomainErrorCode, AddDomainResult 
} from './add-domain-result'

/** @riviere-role command-use-case */
export function addDomain(input: AddDomainInput): AddDomainResult {
  const repository = new RiviereBuilderRepository()

  try {
    const builder = repository.load(input.graphPathOption)
    builder.addDomain({
      description: input.description,
      name: input.name,
      systemType: input.systemType,
    })
    repository.save(builder)
    return {
      description: input.description,
      name: input.name,
      success: true,
      systemType: input.systemType,
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

function failure(code: AddDomainErrorCode, message: string): AddDomainResult {
  return {
    code,
    message,
    success: false,
  }
}
