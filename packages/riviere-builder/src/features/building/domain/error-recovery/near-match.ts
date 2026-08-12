import type { BuilderGraph } from '../builder-graph'
import { findNearMatches } from './component-suggestion'

/** @riviere-role domain-service */
export class NearMatch {
  private readonly graph: BuilderGraph

  constructor(graph: BuilderGraph) {
    this.graph = graph
  }

  findNearMatches(
    query: Readonly<{
      name: string
      type?: import('@living-architecture/riviere-schema').ComponentType
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
