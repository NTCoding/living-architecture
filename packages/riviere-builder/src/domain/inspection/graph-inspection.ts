import type { ValidationResult } from '@living-architecture/riviere-query'
import { RiviereQuery } from '@living-architecture/riviere-query'
import type { BuilderGraph } from '../builder-graph'
import type {
  BuilderStats, BuilderWarning 
} from './inspection-types'
import {
  calculateStats,
  findOrphans,
  findWarnings,
  toRiviereGraph,
  validateGraph,
} from '../../inspection'

export class GraphInspection {
  private readonly graph: BuilderGraph

  constructor(graph: BuilderGraph) {
    this.graph = graph
  }

  warnings(): BuilderWarning[] {
    return findWarnings(this.graph)
  }

  stats(): BuilderStats {
    return calculateStats(this.graph)
  }

  orphans(): string[] {
    return findOrphans(this.graph)
  }

  validate(): ValidationResult {
    return validateGraph(this.graph)
  }

  query(): RiviereQuery {
    return new RiviereQuery(toRiviereGraph(this.graph))
  }
}
