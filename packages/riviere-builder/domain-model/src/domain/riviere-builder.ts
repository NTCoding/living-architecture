import type {
  DomainMetadata,
  RiviereGraph,
  SourceInfo,
} from '@living-architecture/riviere-schema-published-language/schema'
import { BuilderGraph } from './builder-graph'
import { GraphConstruction } from './construction/graph-construction'
import { GraphEnrichment } from './enrichment/graph-enrichment'
import { GraphLinking } from './linking/graph-linking'
import { GraphInspection } from './inspection/graph-inspection'
import { NearMatch } from './error-recovery/near-match'
import {
  BuildValidationError,
  InvalidGraphError,
  MissingDomainsError,
  MissingSourcesError,
} from './construction/construction-errors'
import { toRiviereGraph } from './inspection/inspection-functions'

type ScalarOverwriteWarning = Readonly<{
  code: 'SCALAR_OVERWRITE'
  message: string
  componentId: string
  field: string
  oldValue: string | number | boolean
  newValue: string | number | boolean
}>

type DuplicateLinkWarning = Readonly<{
  code: 'DUPLICATE_LINK_SKIPPED'
  message: string
  source: string
  target: string
  linkType?: string
  targetRepository?: string
  targetName: string
}>

type OperationWarning = ScalarOverwriteWarning | DuplicateLinkWarning

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export class RiviereBuilder {
  readonly graphPath: string

  private graph: BuilderGraph
  private readonly operationWarnings: OperationWarning[]

  private constructor(graph: BuilderGraph, graphPath: string) {
    this.graph = graph
    this.graphPath = graphPath
    this.operationWarnings = []
  }

  get construction(): GraphConstruction {
    return new GraphConstruction(
      this.graph,
      (warning) => this.operationWarnings.push(warning),
      (graph) => {
        this.graph = graph
      },
    )
  }

  get enrichment(): GraphEnrichment {
    return new GraphEnrichment(this.graph, (graph) => {
      this.graph = graph
    })
  }

  get linking(): GraphLinking {
    return new GraphLinking(
      this.graph,
      (warning) => this.operationWarnings.push(warning),
      (graph) => {
        this.graph = graph
      },
    )
  }

  get inspection(): GraphInspection {
    return new GraphInspection(this.graph, this.operationWarnings)
  }

  get errorRecovery(): NearMatch {
    return new NearMatch(this.graph)
  }

  static resume(graph: RiviereGraph, graphPath = ''): RiviereBuilder {
    if (!graph.metadata.sources || graph.metadata.sources.length === 0) {
      throw new InvalidGraphError('missing sources')
    }

    const builderGraph = BuilderGraph.parse({
      version: graph.version,
      metadata: {
        ...graph.metadata,
        sources: graph.metadata.sources,
        customTypes: graph.metadata.customTypes ?? {},
        relationshipTypes: graph.metadata.relationshipTypes ?? {},
      },
      components: graph.components,
      links: graph.links,
      externalLinks: graph.externalLinks ?? [],
    })
    return new RiviereBuilder(builderGraph, graphPath)
  }

  static new(
    options: {
      readonly name?: string
      readonly description?: string
      readonly sources: readonly SourceInfo[]
      readonly domains: Readonly<Record<string, DomainMetadata>>
    },
    graphPath = '',
  ): RiviereBuilder {
    if (options.sources.length === 0) {
      throw new MissingSourcesError()
    }

    if (Object.keys(options.domains).length === 0) {
      throw new MissingDomainsError()
    }

    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        ...(options.name !== undefined && { name: options.name }),
        ...(options.description !== undefined && { description: options.description }),
        sources: [...options.sources],
        domains: { ...options.domains },
        customTypes: {},
        relationshipTypes: {},
      },
      components: [],
      links: [],
      externalLinks: [],
    })

    return new RiviereBuilder(graph, graphPath)
  }

  serialize(): string {
    const graph = this.graph
    return JSON.stringify(
      {
        version: graph.version,
        metadata: graph.metadata,
        components: [...graph.components],
        links: [...graph.links],
        externalLinks: [...graph.externalLinks],
      },
      null,
      2,
    )
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
