import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type { ComponentId } from './branded-types'
import type { GraphStats } from './stats-types'
import { queryStats } from './stats-queries'
import { queryNodeDepths } from './depth-queries'

export class StatsQueries {
  constructor(private readonly graph: RiviereGraph) {}

  stats(): GraphStats {
    return queryStats(this.graph)
  }

  nodeDepths(): Map<ComponentId, number> {
    return queryNodeDepths(this.graph)
  }
}
