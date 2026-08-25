import type { BuilderGraph } from '../builder-graph'
import { findNearMatches } from './component-suggestion'

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export class NearMatch {
  private readonly graph: BuilderGraph

  constructor(graph: BuilderGraph) {
    this.graph = graph
  }

  findNearMatches(
    query: Readonly<{
      name: string
      type?: import('@living-architecture/riviere-schema-published-language/schema').ComponentType
      domain?: string
    }>,
    options?: Readonly<{
      threshold?: number
      limit?: number
    }>,
  ) {
    return findNearMatches(this.graph.components, query, options)
  }
}
