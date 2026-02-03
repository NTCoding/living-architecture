import { RiviereQuery } from '@living-architecture/riviere-query'
import type {
  Component, HttpMethod, RiviereGraph 
} from '@living-architecture/riviere-schema'

export interface ApiComponent {
  id: string
  type: 'API'
  name: string
  domain: string
  path: string
  httpMethod: HttpMethod
}

function isRestApiWithPath(component: Component): component is Component & ApiComponent {
  return component.type === 'API' && 'path' in component && 'httpMethod' in component
}

export function findApisByPath(
  graph: RiviereGraph,
  path: string,
  method?: HttpMethod,
): ApiComponent[] {
  const query = new RiviereQuery(graph)
  const allComponents = query.componentsByType('API')
  const apis = allComponents.filter(isRestApiWithPath)
  const matchingPath = apis.filter((api) => api.path === path)

  if (method) {
    return matchingPath.filter((api) => api.httpMethod === method)
  }

  return matchingPath
}

export function getAllApiPaths(graph: RiviereGraph): string[] {
  const query = new RiviereQuery(graph)
  const allComponents = query.componentsByType('API')
  const apis = allComponents.filter(isRestApiWithPath)
  return [...new Set(apis.map((api) => api.path))]
}
