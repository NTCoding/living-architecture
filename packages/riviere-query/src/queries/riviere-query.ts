import type { RiviereGraph } from '@living-architecture/riviere-schema'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import { ComponentQueries } from './component-queries-delegate'
import { FlowQueries } from './flow-queries-delegate'
import { DomainQueries } from './domain-queries-delegate'
import { EventQueries } from './event-queries-delegate'
import { CrossDomainQueries } from './cross-domain-queries-delegate'
import { ExternalQueries } from './external-queries-delegate'
import { ValidationQueries } from './validation-queries-delegate'
import { DiffQueries } from './diff-queries-delegate'
import { StatsQueries } from './stats-queries-delegate'

function assertValidGraph(graph: unknown): asserts graph is RiviereGraph {
  parseRiviereGraph(graph)
}

export class RiviereQuery {
  readonly components: ComponentQueries
  readonly flows: FlowQueries
  readonly domains: DomainQueries
  readonly events: EventQueries
  readonly crossDomain: CrossDomainQueries
  readonly external: ExternalQueries
  readonly validation: ValidationQueries
  readonly comparison: DiffQueries
  readonly stats: StatsQueries

  constructor(graph: RiviereGraph) {
    assertValidGraph(graph)
    this.components = new ComponentQueries(graph)
    this.flows = new FlowQueries(graph)
    this.domains = new DomainQueries(graph)
    this.events = new EventQueries(graph)
    this.crossDomain = new CrossDomainQueries(graph)
    this.external = new ExternalQueries(graph)
    this.validation = new ValidationQueries(graph)
    this.comparison = new DiffQueries(graph)
    this.stats = new StatsQueries(graph)
  }

  static fromJSON(json: unknown): RiviereQuery {
    assertValidGraph(json)
    return new RiviereQuery(json)
  }
}
