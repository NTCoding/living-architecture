import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { AddSourceInput } from './add-source-input'
import type {
  AddSourceErrorCode, AddSourceResult 
} from './add-source-result'

/** @riviere-role command-use-case */
export function addSource(input: AddSourceInput): AddSourceResult {
  const repository = new RiviereBuilderRepository()

  try {
    const builder = repository.load(input.graphPathOption)
    builder.addSource({ repository: input.repository })
    repository.save(builder)
    return {
      repository: input.repository,
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

function failure(code: AddSourceErrorCode, message: string): AddSourceResult {
  return {
    code,
    message,
    success: false,
  }
}
