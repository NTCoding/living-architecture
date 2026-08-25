import type {
  Component,
  ComponentType,
  RiviereGraph,
} from '@living-architecture/riviere-schema-published-language/schema'

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function findComponent(
  graph: RiviereGraph,
  predicate: (component: Component) => boolean,
): Component | undefined {
  return graph.components.find(predicate)
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function findAllComponents(
  graph: RiviereGraph,
  predicate: (component: Component) => boolean,
): Component[] {
  return graph.components.filter(predicate)
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
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

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function componentsInDomain(graph: RiviereGraph, domainName: string): Component[] {
  return findAllComponents(graph, (c) => c.domain === domainName)
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function componentsByType(graph: RiviereGraph, type: ComponentType): Component[] {
  return findAllComponents(graph, (c) => c.type === type)
}
