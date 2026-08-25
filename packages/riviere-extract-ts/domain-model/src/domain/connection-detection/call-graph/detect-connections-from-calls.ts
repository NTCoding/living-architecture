import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import { ExtractedLink } from '../extracted-link'
import type { CallSite } from './call-graph-types'
import type { CallableReference } from './callable-reference'
import type { ScopedCallGraph, ScopedCallGraphEdge } from './scoped-call-graph'

interface LocatedLink {
  readonly link: ExtractedLink
  readonly location: ReturnType<typeof sourceLocation>
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function detectConnectionsFromCalls(
  graph: ScopedCallGraph,
  repository: string,
): ExtractedLink[] {
  const links = graph.roots.flatMap((root) =>
    collapseFromRoot(graph, root.component, root.callable, repository),
  )
  const uncertainLinks = graph.unresolvedCalls.map((unresolved) => {
    const location = sourceLocation(repository, unresolved.originCallSite)
    return {
      link: ExtractedLink.parse({
        source: componentId(unresolved.sourceComponent),
        target: '_unresolved',
        type: 'sync',
        _uncertain: unresolved.reason,
        sourceLocation: location,
      }),
      location,
    }
  })
  return deduplicate([...links, ...uncertainLinks])
}

function collapseFromRoot(
  graph: ScopedCallGraph,
  sourceComponent: EnrichedComponent,
  sourceCallable: CallableReference,
  repository: string,
): LocatedLink[] {
  return followEdges({
    graph,
    sourceComponent,
    callable: sourceCallable,
    repository,
    visited: new Set([sourceCallable.toKey()]),
  })
}

function followEdges(input: {
  graph: ScopedCallGraph
  sourceComponent: EnrichedComponent
  callable: CallableReference
  repository: string
  visited: ReadonlySet<string>
  originCallSite?: CallSite
}): LocatedLink[] {
  const outgoingEdges = input.graph.edges.filter(
    (edge) => edge.source.toKey() === input.callable.toKey(),
  )
  return outgoingEdges.flatMap((edge) => followEdge(edge, input))
}

function followEdge(
  edge: ScopedCallGraphEdge,
  input: {
    graph: ScopedCallGraph
    sourceComponent: EnrichedComponent
    repository: string
    visited: ReadonlySet<string>
    originCallSite?: CallSite
  },
): LocatedLink[] {
  const originCallSite = input.originCallSite ?? edge.callSite
  if (edge.targetComponent !== undefined) {
    if (componentId(input.sourceComponent) === componentId(edge.targetComponent)) return []
    const location = sourceLocation(input.repository, originCallSite)
    return [
      {
        link: ExtractedLink.parse({
          source: componentId(input.sourceComponent),
          target: componentId(edge.targetComponent),
          type: 'sync',
          sourceLocation: location,
        }),
        location,
      },
    ]
  }
  const targetKey = edge.target.toKey()
  if (input.visited.has(targetKey)) return []
  return followEdges({
    ...input,
    callable: edge.target,
    originCallSite,
    visited: new Set([...input.visited, targetKey]),
  })
}

function deduplicate(links: readonly LocatedLink[]): ExtractedLink[] {
  const linksByIdentity = new Map<string, LocatedLink>()
  for (const locatedLink of links) {
    const link = locatedLink.link
    const key = `${link.source}|${link.target}|${link.type}`
    const existing = linksByIdentity.get(key)
    if (existing === undefined || earlierThan(locatedLink, existing)) {
      linksByIdentity.set(key, locatedLink)
    }
  }
  return [...linksByIdentity.values()].map(({ link }) => link)
}

function earlierThan(candidate: LocatedLink, existing: LocatedLink): boolean {
  const candidateLocation = candidate.location
  const existingLocation = existing.location
  if (candidateLocation.filePath !== existingLocation.filePath) {
    return candidateLocation.filePath < existingLocation.filePath
  }
  return candidateLocation.lineNumber < existingLocation.lineNumber
}

function componentId(component: EnrichedComponent): string {
  return ComponentId.parseFromParts(component).toString()
}

function sourceLocation(repository: string, callSite: CallSite) {
  return {
    repository,
    filePath: callSite.filePath,
    lineNumber: callSite.lineNumber,
    methodName: callSite.methodName,
  }
}
