import { ComponentNotFoundError } from '@living-architecture/riviere-builder'
import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { LinkComponentsInput } from './link-components-input'
import type {
  LinkComponentsErrorCode, LinkComponentsResult 
} from './link-components-result'

/** @riviere-role command-use-case */
export class LinkComponents {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: LinkComponentsInput): LinkComponentsResult {
    try {
      const builder = this.repository.load(input.graphPathOption)
      const linkInput: {
        from: string
        to: string
        type?: 'sync' | 'async'
      } = {
        from: input.from,
        to: input.to,
      }
      if (input.type !== undefined) {
        linkInput.type = input.type
      }
      const link = builder.link(linkInput)
      this.repository.save(builder)
      return {
        link,
        success: true,
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) {
        return failure('GRAPH_NOT_FOUND', error.message)
      }
      if (error instanceof GraphCorruptedError) {
        return failure('GRAPH_CORRUPTED', 'Graph file contains invalid JSON')
      }
      if (error instanceof ComponentNotFoundError) {
        return failure('COMPONENT_NOT_FOUND', error.message, error.suggestions)
      }
      throw error
    }
  }
}

function failure(
  code: LinkComponentsErrorCode,
  message: string,
  suggestions: string[] = [],
): LinkComponentsResult {
  return {
    code,
    message,
    suggestions,
    success: false,
  }
}
