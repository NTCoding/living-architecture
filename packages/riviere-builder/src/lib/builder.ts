import type {
  DomainMetadata,
  GraphMetadata,
  RiviereGraph,
  SourceInfo,
  SystemType,
} from '@living-architecture/riviere-schema'

export interface BuilderOptions {
  name?: string
  description?: string
  sources: SourceInfo[]
  domains: Record<string, DomainMetadata>
}

export interface DomainInput {
  name: string
  description: string
  systemType: SystemType
}

interface BuilderMetadata extends Omit<GraphMetadata, 'sources'> {
  sources: SourceInfo[]
}

interface BuilderGraph extends Omit<RiviereGraph, 'metadata'> {
  metadata: BuilderMetadata
}

export class RiviereBuilder {
  graph: BuilderGraph

  private constructor(graph: BuilderGraph) {
    this.graph = graph
  }

  static new(options: BuilderOptions): RiviereBuilder {
    if (options.sources.length === 0) {
      throw new Error('At least one source required')
    }

    if (Object.keys(options.domains).length === 0) {
      throw new Error('At least one domain required')
    }

    const graph: BuilderGraph = {
      version: '1.0',
      metadata: {
        ...(options.name !== undefined && { name: options.name }),
        ...(options.description !== undefined && { description: options.description }),
        sources: options.sources,
        domains: options.domains,
      },
      components: [],
      links: [],
    }

    return new RiviereBuilder(graph)
  }

  addSource(source: SourceInfo): void {
    this.graph.metadata.sources.push(source)
  }

  addDomain(input: DomainInput): void {
    if (this.graph.metadata.domains[input.name]) {
      throw new Error(`Domain '${input.name}' already exists`)
    }

    this.graph.metadata.domains[input.name] = {
      description: input.description,
      systemType: input.systemType,
    }
  }
}
