import type {
  RiviereGraph,
  Component,
  ComponentType,
  Link,
  ExternalLink,
} from '@living-architecture/riviere-schema';
import type {
  ComponentId,
  LinkId,
  Flow,
  SearchWithFlowResult,
} from './domain-types';
import {
 parseComponentId, parseLinkId 
} from './domain-types';
import {
 componentById, searchComponents 
} from './component-queries';
import { ComponentNotFoundError } from './errors';

export function findEntryPoints(graph: RiviereGraph): Component[] {
  const targets = new Set(graph.links.map((link) => link.target));
  const entryPointTypes = new Set<ComponentType>([
    'UI',
    'API',
    'EventHandler',
    'Custom',
  ]);
  return graph.components.filter(
    (c) => entryPointTypes.has(c.type) && !targets.has(c.id),
  );
}

export function traceFlowFrom(
  graph: RiviereGraph,
  startComponentId: ComponentId,
): {
  componentIds: ComponentId[];
  linkIds: LinkId[];
} {
  const component = componentById(graph, startComponentId);
  if (!component) {
    throw new ComponentNotFoundError(startComponentId);
  }

  const visited = new Set<ComponentId>();
  const visitedLinks = new Set<LinkId>();
  const queue: ComponentId[] = [startComponentId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined || visited.has(currentId)) continue;
    visited.add(currentId);

    for (const link of graph.links) {
      const sourceId = parseComponentId(link.source);
      const targetId = parseComponentId(link.target);
      if (link.source === currentId && !visited.has(targetId)) {
        queue.push(targetId);
        visitedLinks.add(createLinkKey(link));
      }
      if (link.target === currentId && !visited.has(sourceId)) {
        queue.push(sourceId);
        visitedLinks.add(createLinkKey(link));
      }
    }
  }

  return {
    componentIds: Array.from(visited),
    linkIds: Array.from(visitedLinks),
  };
}

function createLinkKey(link: Link): LinkId {
  if (link.id !== undefined) {
    return parseLinkId(link.id);
  }
  return parseLinkId(`${link.source}->${link.target}`);
}

export function queryFlows(graph: RiviereGraph): Flow[] {
  const componentByIdMap = new Map(graph.components.map((c) => [c.id, c]));
  const outgoingEdges = buildOutgoingEdges(graph);
  const externalLinksBySource = buildExternalLinksBySource(graph);

  const traceForward = (entryPointId: string): Flow['steps'] => {
    const steps: Flow['steps'] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string, depth: number): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const component = componentByIdMap.get(nodeId);
      if (!component) return;

      const edges = outgoingEdges.get(nodeId);
      const firstEdge =
        edges !== undefined && edges.length > 0 ? edges[0] : undefined;
      const linkType = firstEdge === undefined ? undefined : firstEdge.type;
      const externalLinks = externalLinksBySource.get(nodeId) ?? [];

      steps.push({
        component,
        linkType,
        depth,
        externalLinks,
      });

      if (edges) {
        for (const edge of edges) {
          traverse(edge.target, depth + 1);
        }
      }
    };

    traverse(entryPointId, 0);
    return steps;
  };

  return findEntryPoints(graph).map((entryPoint) => ({
    entryPoint,
    steps: traceForward(entryPoint.id),
  }));
}

function buildExternalLinksBySource(
  graph: RiviereGraph,
): Map<string, ExternalLink[]> {
  const externalLinks = graph.externalLinks ?? [];
  const bySource = new Map<string, ExternalLink[]>();

  for (const link of externalLinks) {
    const existing = bySource.get(link.source);
    if (existing) {
      existing.push(link);
    } else {
      bySource.set(link.source, [link]);
    }
  }

  return bySource;
}

function buildOutgoingEdges(graph: RiviereGraph): Map<
  string,
  Array<{
    target: string;
    type: 'sync' | 'async' | undefined;
  }>
> {
  const edges = new Map<
    string,
    Array<{
      target: string;
      type: 'sync' | 'async' | undefined;
    }>
  >();
  for (const link of graph.links) {
    const entry = {
      target: link.target,
      type: link.type,
    };
    const existing = edges.get(link.source);
    if (existing) {
      existing.push(entry);
    } else {
      edges.set(link.source, [entry]);
    }
  }
  return edges;
}

/**
 * Options for searchWithFlow.
 */
export interface SearchWithFlowOptions {
  /** If true, returns all components when the query is empty. */
  returnAllOnEmptyQuery: boolean;
}

export function searchWithFlowContext(
  graph: RiviereGraph,
  query: string,
  options: SearchWithFlowOptions,
): SearchWithFlowResult {
  const trimmedQuery = query.trim().toLowerCase();
  const isEmptyQuery = trimmedQuery === '';

  if (isEmptyQuery) {
    if (options.returnAllOnEmptyQuery) {
      const allIds = graph.components.map((c) => parseComponentId(c.id));
      return {
        matchingIds: allIds,
        visibleIds: allIds,
      };
    }
    return {
      matchingIds: [],
      visibleIds: [],
    };
  }

  const matchingComponents = searchComponents(graph, query);
  if (matchingComponents.length === 0) {
    return {
      matchingIds: [],
      visibleIds: [],
    };
  }

  const matchingIds = matchingComponents.map((c) => parseComponentId(c.id));
  const visibleIds = new Set<ComponentId>();

  for (const component of matchingComponents) {
    const flow = traceFlowFrom(graph, parseComponentId(component.id));
    for (const id of flow.componentIds) {
      visibleIds.add(id);
    }
  }

  return {
    matchingIds,
    visibleIds: Array.from(visibleIds),
  };
}
