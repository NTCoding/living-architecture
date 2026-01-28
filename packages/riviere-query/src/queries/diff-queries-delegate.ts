import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type { GraphDiff } from './diff-types'
import { diffGraphs } from './graph-diff'

export class DiffQueries {
  constructor(private readonly graph: RiviereGraph) {}

  diff(other: RiviereGraph): GraphDiff {
    return diffGraphs(this.graph, other)
  }
}
