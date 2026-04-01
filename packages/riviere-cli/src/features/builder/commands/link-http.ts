import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import { findApisByPath, getAllApiPaths } from '../domain/api-component-queries'
import type { LinkHttpInput } from './link-http-input'
import type { LinkHttpResult } from './link-http-result'

/** @riviere-role command-use-case */
export async function linkHttp(input: LinkHttpInput): Promise<LinkHttpResult> {
  const repository = new RiviereBuilderRepository()
  const loadedGraph = await repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    return {
      code: loadedGraph.code,
      message:
        loadedGraph.code === 'GRAPH_NOT_FOUND'
          ? `Graph not found at ${loadedGraph.graphPath}`
          : 'Graph file contains invalid JSON',
      suggestions: [],
      success: false,
    }
  }

  const graph = loadedGraph.builder.build()
  const matchingApis = findApisByPath(graph, input.path, input.httpMethod)
  const [matchedApi, ...otherApis] = matchingApis

  if (!matchedApi) {
    return {
      code: 'VALIDATION_ERROR',
      message: `No API found for path ${input.path}`,
      suggestions: getAllApiPaths(graph),
      success: false,
    }
  }

  if (otherApis.length > 0) {
    return {
      code: 'AMBIGUOUS_API_MATCH',
      message: `Multiple APIs matched path ${input.path}`,
      suggestions: matchingApis.map((api) => `${api.httpMethod ?? 'ANY'} ${api.path}`),
      success: false,
    }
  }

  const link = loadedGraph.builder.link({
    from: matchedApi.id,
    to: input.targetId,
    ...(input.linkType !== undefined ? { type: input.linkType } : {}),
  })
  await repository.save(loadedGraph.builder, input.graphPathOption)

  return {
    link,
    matchedApi: {
      id: matchedApi.id,
      method: matchedApi.httpMethod,
      path: matchedApi.path,
    },
    success: true,
  }
}
