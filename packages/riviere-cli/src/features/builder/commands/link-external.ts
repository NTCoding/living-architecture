import { ComponentNotFoundError } from '@living-architecture/riviere-builder'
import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { LinkExternalInput } from './link-external-input'
import type {
  LinkExternalErrorCode, LinkExternalResult 
} from './link-external-result'

/** @riviere-role command-use-case */
export class LinkExternal {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: LinkExternalInput): LinkExternalResult {
    try {
      const builder = this.repository.load(input.graphPathOption)
      const externalLinkInput: Parameters<typeof builder.linkExternal>[0] = {
        from: input.from,
        target: input.target,
      }
      if (input.type !== undefined) {
        externalLinkInput.type = input.type
      }
      const externalLink = builder.linkExternal(externalLinkInput)
      this.repository.save(builder)
      return {
        externalLink,
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
  code: LinkExternalErrorCode,
  message: string,
  suggestions: string[] = [],
): LinkExternalResult {
  return {
    code,
    message,
    suggestions,
    success: false,
  }
}
