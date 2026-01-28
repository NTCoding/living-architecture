import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type { BuilderGraph } from './builder-graph'
import { GraphConstruction } from './construction/graph-construction'
import { GraphEnrichment } from './enrichment/graph-enrichment'
import { GraphLinking } from './linking/graph-linking'
import { GraphInspection } from './inspection/graph-inspection'
import { NearMatch } from './error-recovery/near-match'
import type { BuilderOptions } from './construction/construction-types'
import {
  BuildValidationError,
  InvalidGraphError,
  MissingDomainsError,
  MissingSourcesError,
} from './construction/construction-errors'
import { toRiviereGraph } from '../inspection'

export class RiviereBuilder {
  readonly construction: GraphConstruction
  readonly enrichment: GraphEnrichment
  readonly linking: GraphLinking
  readonly inspection: GraphInspection
  readonly errorRecovery: NearMatch

  readonly graph: BuilderGraph

  private constructor(graph: BuilderGraph) {
    this.graph = graph
    this.construction = new GraphConstruction(graph)
    this.enrichment = new GraphEnrichment(graph)
    this.linking = new GraphLinking(graph)
    this.inspection = new GraphInspection(graph)
    this.errorRecovery = new NearMatch(graph)
  }

  static resume(graph: RiviereGraph): RiviereBuilder {
    if (!graph.metadata.sources || graph.metadata.sources.length === 0) {
      throw new InvalidGraphError('missing sources')
    }

    const builderGraph: BuilderGraph = {
      version: graph.version,
      metadata: {
        ...graph.metadata,
        sources: graph.metadata.sources,
        customTypes: graph.metadata.customTypes ?? {},
      },
      components: graph.components,
      links: graph.links,
      externalLinks: graph.externalLinks ?? [],
    }
    return new RiviereBuilder(builderGraph)
  }

  static new(options: BuilderOptions): RiviereBuilder {
    if (options.sources.length === 0) {
      throw new MissingSourcesError()
    }

    if (Object.keys(options.domains).length === 0) {
      throw new MissingDomainsError()
    }

    const graph: BuilderGraph = {
      version: '1.0',
      metadata: {
        ...(options.name !== undefined && { name: options.name }),
        ...(options.description !== undefined && { description: options.description }),
        sources: options.sources,
        domains: options.domains,
        customTypes: {},
      },
      components: [],
      links: [],
      externalLinks: [],
    }

    return new RiviereBuilder(graph)
  }

  serialize(): string {
    return JSON.stringify(this.graph, null, 2)
  }

  build(): RiviereGraph {
    const result = this.inspection.validate()
    if (!result.valid) {
      const messages = result.errors.map((e) => e.message)
      throw new BuildValidationError(messages)
    }
    return toRiviereGraph(this.graph)
  }
}
