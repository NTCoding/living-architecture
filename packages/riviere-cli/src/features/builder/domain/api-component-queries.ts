import { RiviereQuery } from '@living-architecture/riviere-query'
import type {
  APIComponent,
  Component,
  HttpMethod,
  RiviereGraph,
} from '@living-architecture/riviere-schema'

type RestApiWithPath = APIComponent & Required<Pick<APIComponent, 'httpMethod' | 'path'>>

function isRestApiWithPath(component: Component): component is RestApiWithPath {
  return component.type === 'API' && 'path' in component && 'httpMethod' in component
}

/** @riviere-role domain-service */
export function findApisByPath(
  graph: RiviereGraph,
  path: string,
  method?: HttpMethod,
): RestApiWithPath[] {
  const query = new RiviereQuery(graph)
  const allComponents = query.componentsByType('API')
  const apis = allComponents.filter(isRestApiWithPath)
  const matchingPath = apis.filter((api) => api.path === path)

  if (method) {
    return matchingPath.filter((api) => api.httpMethod === method)
  }

  return matchingPath
}

/** @riviere-role domain-service */
export function getAllApiPaths(graph: RiviereGraph): string[] {
  const query = new RiviereQuery(graph)
  const allComponents = query.componentsByType('API')
  const apis = allComponents.filter(isRestApiWithPath)
  return [...new Set(apis.map((api) => api.path))]
}
