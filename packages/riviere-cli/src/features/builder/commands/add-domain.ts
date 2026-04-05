import { DuplicateDomainError } from '@living-architecture/riviere-builder'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { AddDomainInput } from './add-domain-input'
import type { AddDomainResult } from './add-domain-result'

/** @riviere-role command-use-case */
export function addDomain(input: AddDomainInput): AddDomainResult {
  const repository = new RiviereBuilderRepository()
  const loadedGraph = repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    return {
      code: loadedGraph.code,
      message:
        loadedGraph.code === 'GRAPH_NOT_FOUND'
          ? `Graph not found at ${loadedGraph.graphPath}`
          : 'Graph file contains invalid JSON',
      success: false,
    }
  }

  try {
    loadedGraph.builder.addDomain({
      description: input.description,
      name: input.name,
      systemType: input.systemType,
    })
    repository.save(loadedGraph.builder, input.graphPathOption)
    return {
      description: input.description,
      name: input.name,
      success: true,
      systemType: input.systemType,
    }
  } catch (error) {
    if (error instanceof DuplicateDomainError) {
      return {
        code: 'DUPLICATE_DOMAIN',
        message: error.message,
        success: false,
      }
    }

    throw error
  }
}
