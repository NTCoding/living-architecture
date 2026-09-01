import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import type {
  APIComponent,
  Component,
  HttpMethod as PublishedHttpMethod,
  RiviereGraph,
} from '@living-architecture/riviere-schema-published-language/schema'
import { GraphCorruptedError } from '../data-access/riviere-project/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/riviere-project/graph-not-found-error'
import {
  ComponentType,
  HttpMethod,
  LinkType,
} from '@living-architecture/riviere-builder-published-language'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { LinkHttpInput } from './link-http-input'
import type { LinkHttpErrorCode, LinkHttpResult } from './link-http-result'

/** @riviere-role command-use-case */
export class LinkHttp {
  constructor(private readonly repository: RiviereProjectRepository) {}

  execute(input: LinkHttpInput): LinkHttpResult {
    const parsedInput = parseInput(input)
    if (!parsedInput.success) return parsedInput.result

    try {
      const project = this.repository.loadByGraphPath(input.graphFileLocation)
      const graph = project.build()
      const matchingApis = findApisByPath(graph, input.path, parsedInput.httpMethod?.value)
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
        to: ComponentId.parseFromParts({
          domain: input.targetDomain,
          module: input.targetModule,
          name: input.targetName,
          type: parsedInput.componentType.componentIdValue,
        }).toString(),
      }
      if (parsedInput.linkType !== undefined) {
        linkInput.type = parsedInput.linkType.value
      }

      const link = project.link(linkInput)
      this.repository.save(input.graphFileLocation, project)

      return {
        result: {
          link,
          matchedApi: {
            id: matchedApi.id,
            method: matchedApi.httpMethod,
            path: matchedApi.path,
          },
          success: true,
        },
      }
    } catch (error) {
      if (error instanceof GraphNotFoundError) return failure('GRAPH_NOT_FOUND', error.message)
      if (error instanceof GraphCorruptedError) {
        return failure('GRAPH_CORRUPTED', 'Graph file contains invalid JSON')
      }
      throw error
    }
  }
}

type RestApiWithPath = APIComponent & Required<Pick<APIComponent, 'httpMethod' | 'path'>>

function isRestApiWithPath(component: Component): component is RestApiWithPath {
  return component.type === 'API' && 'path' in component && 'httpMethod' in component
}

function findApisByPath(
  graph: RiviereGraph,
  path: string,
  method?: PublishedHttpMethod,
): RestApiWithPath[] {
  const matchingPath = graph.components.filter(isRestApiWithPath).filter((api) => api.path === path)
  return method === undefined
    ? matchingPath
    : matchingPath.filter((api) => api.httpMethod === method)
}

function getAllApiPaths(graph: RiviereGraph): string[] {
  return [...new Set(graph.components.filter(isRestApiWithPath).map((api) => api.path))]
}

function parseInput(input: LinkHttpInput):
  | {
      success: false
      result: LinkHttpResult
    }
  | {
      success: true
      componentType: ComponentType
      httpMethod: HttpMethod | undefined
      linkType: LinkType | undefined
    } {
  const componentType = ComponentType.parse(input.targetType)
  if (!componentType.success) {
    return invalidInput(`Invalid component type: ${input.targetType}`)
  }
  const httpMethod = input.httpMethod === undefined ? undefined : HttpMethod.parse(input.httpMethod)
  if (httpMethod !== undefined && !httpMethod.success) {
    return invalidInput(`Invalid HTTP method: ${input.httpMethod}`)
  }
  const linkType = input.linkType === undefined ? undefined : LinkType.parse(input.linkType)
  if (linkType !== undefined && !linkType.success) {
    return invalidInput(`Invalid link type: ${input.linkType}`)
  }
  return {
    componentType: componentType.data,
    httpMethod: httpMethod?.data,
    linkType: linkType?.data,
    success: true,
  }
}

function invalidInput(message: string): {
  success: false
  result: LinkHttpResult
} {
  return {
    result: failure('VALIDATION_ERROR', message),
    success: false,
  }
}

function failure(
  code: LinkHttpErrorCode,
  message: string,
  suggestions: string[] = [],
): LinkHttpResult {
  return {
    result: {
      code,
      message,
      suggestions,
      success: false,
    },
  }
}
