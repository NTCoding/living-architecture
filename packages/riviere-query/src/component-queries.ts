import type {
  RiviereGraph, Component, ComponentType 
} from '@living-architecture/riviere-schema';

export function findComponent(
  graph: RiviereGraph,
  predicate: (component: Component) => boolean,
): Component | undefined {
  return graph.components.find(predicate);
}

export function findAllComponents(
  graph: RiviereGraph,
  predicate: (component: Component) => boolean,
): Component[] {
  return graph.components.filter(predicate);
}

export function componentById(graph: RiviereGraph, id: string): Component | undefined {
  return findComponent(graph, (c) => c.id === id);
}

export function searchComponents(graph: RiviereGraph, query: string): Component[] {
  if (query === '') {
    return [];
  }
  const lowerQuery = query.toLowerCase();
  return findAllComponents(
    graph,
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.domain.toLowerCase().includes(lowerQuery) ||
      c.type.toLowerCase().includes(lowerQuery),
  );
}

export function componentsInDomain(graph: RiviereGraph, domainName: string): Component[] {
  return findAllComponents(graph, (c) => c.domain === domainName);
}

export function componentsByType(graph: RiviereGraph, type: ComponentType): Component[] {
  return findAllComponents(graph, (c) => c.type === type);
}
