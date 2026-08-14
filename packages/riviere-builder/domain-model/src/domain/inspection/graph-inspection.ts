import type { ValidationResult } from '@living-architecture/riviere-schema-published-language/graph-validation'
import type { BuilderGraph } from '../builder-graph'
import { RiviereQuery } from '../query/RiviereQuery'
import {
  calculateStats,
  findOrphans,
  findWarnings,
  toRiviereGraph,
  validateGraph,
} from './inspection-functions'

type OperationWarning =
  | Readonly<{
      code: 'SCALAR_OVERWRITE'
      message: string
      componentId: string
      field: string
      oldValue: string | number | boolean
      newValue: string | number | boolean
    }>
  | Readonly<{
      code: 'DUPLICATE_LINK_SKIPPED'
      message: string
      source: string
      target: string
      linkType?: string
      targetRepository?: string
      targetName: string
    }>

/** @riviere-role domain-service */
export class GraphInspection {
  private readonly graph: BuilderGraph
  private readonly operationWarnings: readonly OperationWarning[]

  constructor(graph: BuilderGraph, operationWarnings: readonly OperationWarning[]) {
    this.graph = graph
    this.operationWarnings = operationWarnings
  }

  warnings() {
    return [...findWarnings(this.graph), ...this.operationWarnings]
  }

  stats() {
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
