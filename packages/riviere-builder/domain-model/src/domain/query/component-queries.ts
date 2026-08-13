import type {
  Component,
  ComponentType,
  RiviereGraph,
} from '@living-architecture/riviere-schema/schema'

/** @riviere-role domain-service */
export function findComponent(
  graph: RiviereGraph,
  predicate: (component: Component) => boolean,
): Component | undefined {
  return graph.components.find(predicate)
}

/** @riviere-role domain-service */
export function findAllComponents(
  graph: RiviereGraph,
  predicate: (component: Component) => boolean,
): Component[] {
  return graph.components.filter(predicate)
}

/** @riviere-role domain-service */
export function componentById(graph: RiviereGraph, id: string): Component | undefined {
  return findComponent(graph, (c) => c.id === id)
}

/** @riviere-role domain-service */
export function searchComponents(graph: RiviereGraph, query: string): Component[] {
  if (query === '') {
    return []
  }
  const lowerQuery = query.toLowerCase()
  return findAllComponents(
    graph,
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.domain.toLowerCase().includes(lowerQuery) ||
      c.type.toLowerCase().includes(lowerQuery),
  )
}

/** @riviere-role domain-service */
export function componentsInDomain(graph: RiviereGraph, domainName: string): Component[] {
  return findAllComponents(graph, (c) => c.domain === domainName)
}

/** @riviere-role domain-service */
export function componentsByType(graph: RiviereGraph, type: ComponentType): Component[] {
  return findAllComponents(graph, (c) => c.type === type)
}
