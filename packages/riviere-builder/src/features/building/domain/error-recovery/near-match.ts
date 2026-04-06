import type { BuilderGraph } from '../builder-graph'
import type {
  NearMatchOptions, NearMatchQuery, NearMatchResult 
} from './match-types'
import { findNearMatches } from './component-suggestion'

/** @riviere-role domain-service */
export class NearMatch {
  private readonly graph: BuilderGraph

  constructor(graph: BuilderGraph) {
    this.graph = graph
  }

  findNearMatches(query: NearMatchQuery, options?: NearMatchOptions): NearMatchResult[] {
    return findNearMatches(this.graph.components, query, options)
  }
}
