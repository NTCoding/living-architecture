import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import {
  findApisByPath, getAllApiPaths 
} from '../domain/api-component-queries'
import type { LinkHttpInput } from './link-http-input'
import type {
  LinkHttpErrorCode, LinkHttpResult 
} from './link-http-result'

/** @riviere-role command-use-case */
export class LinkHttp {
  constructor(private readonly repository: RiviereBuilderRepository) {}

  execute(input: LinkHttpInput): LinkHttpResult {
    try {
      const builder = this.repository.load(input.graphPathOption)
      const graph = builder.build()
      const matchingApis = findApisByPath(graph, input.path, input.httpMethod)
      const [matchedApi, ...otherApis] = matchingApis

      if (matchedApi === undefined) {
        return failure(
          'COMPONENT_NOT_FOUND',
          `No API found for path ${input.path}`,
          getAllApiPaths(graph),
        )
      }

      if (otherApis.length > 0) {
        return failure(
          'AMBIGUOUS_API_MATCH',
          `Multiple APIs matched path ${input.path}`,
          /* v8 ignore next -- defensive ANY fallback for malformed API metadata */
          matchingApis.map((api) => `${api.httpMethod ?? 'ANY'} ${api.path}`),
        )
      }

      const linkInput: {
        from: string
        to: string
        type?: 'sync' | 'async'
      } = {
        from: matchedApi.id,
        to: input.targetId,
      }
      if (input.linkType !== undefined) {
        linkInput.type = input.linkType
      }

      const link = builder.link(linkInput)
      this.repository.save(builder)

      return {
        link,
        matchedApi: {
          id: matchedApi.id,
          method: matchedApi.httpMethod,
          path: matchedApi.path,
        },
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
}

function failure(
  code: LinkHttpErrorCode,
  message: string,
  suggestions: string[] = [],
): LinkHttpResult {
  return {
    code,
    message,
    suggestions,
    success: false,
  }
}
