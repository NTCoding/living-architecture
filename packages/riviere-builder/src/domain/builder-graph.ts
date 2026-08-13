import type {
  Component,
  CustomTypeDefinition,
  DomainMetadata,
  ExternalLink,
  Link,
  RelationshipTypeDefinition,
  SourceInfo,
} from '@living-architecture/riviere-schema/schema'

type BuilderGraphDefinition = Readonly<{
  version: string
  metadata: Readonly<{
    name?: string
    description?: string
    generated?: string
    sources: readonly SourceInfo[]
    domains: Readonly<Record<string, DomainMetadata>>
    customTypes: Readonly<Record<string, CustomTypeDefinition>>
    relationshipTypes: Readonly<Record<string, RelationshipTypeDefinition>>
  }>
  components: readonly Component[]
  links: readonly Link[]
  externalLinks: readonly ExternalLink[]
}>

/** @riviere-role value-object */
export class BuilderGraph {
  declare private readonly brand: 'BuilderGraph'

  readonly version: string
  readonly metadata: BuilderGraphDefinition['metadata']
  readonly components: readonly Component[]
  readonly links: readonly Link[]
  readonly externalLinks: readonly ExternalLink[]

  private constructor(definition: BuilderGraphDefinition) {
    this.version = definition.version
    this.metadata = {
      ...(definition.metadata.name !== undefined && { name: definition.metadata.name }),
      ...(definition.metadata.description !== undefined && {
        description: definition.metadata.description,
      }),
      ...(definition.metadata.generated !== undefined && {
        generated: definition.metadata.generated,
      }),
      sources: [...definition.metadata.sources],
      domains: { ...definition.metadata.domains },
      customTypes: { ...definition.metadata.customTypes },
      relationshipTypes: { ...definition.metadata.relationshipTypes },
    }
    this.components = [...definition.components]
    this.links = [...definition.links]
    this.externalLinks = [...definition.externalLinks]
  }

  static parse(definition: BuilderGraphDefinition): BuilderGraph {
    return new BuilderGraph(definition)
  }

  withSource(source: SourceInfo): BuilderGraph {
    return BuilderGraph.parse({
      ...this.definition(),
      metadata: {
        ...this.metadata,
        sources: [...this.metadata.sources, source],
      },
    })
  }

  withDomain(name: string, domain: DomainMetadata): BuilderGraph {
    return BuilderGraph.parse({
      ...this.definition(),
      metadata: {
        ...this.metadata,
        domains: {
          ...this.metadata.domains,
          [name]: domain,
        },
      },
    })
  }

  withCustomType(name: string, definition: CustomTypeDefinition): BuilderGraph {
    return BuilderGraph.parse({
      ...this.definition(),
      metadata: {
        ...this.metadata,
        customTypes: {
          ...this.metadata.customTypes,
          [name]: definition,
        },
      },
    })
  }

  withRelationshipType(name: string, definition: RelationshipTypeDefinition): BuilderGraph {
    return BuilderGraph.parse({
      ...this.definition(),
      metadata: {
        ...this.metadata,
        relationshipTypes: {
          ...this.metadata.relationshipTypes,
          [name]: definition,
        },
      },
    })
  }

  withComponent(component: Component): BuilderGraph {
    return BuilderGraph.parse({
      ...this.definition(),
      components: [...this.components, component],
    })
  }

  withComponentAt(index: number, component: Component): BuilderGraph {
    return BuilderGraph.parse({
      ...this.definition(),
      components: this.components.map((existing, existingIndex) =>
        existingIndex === index ? component : existing,
      ),
    })
  }

  withLink(link: Link): BuilderGraph {
    return BuilderGraph.parse({
      ...this.definition(),
      links: [...this.links, link],
    })
  }

  withExternalLink(link: ExternalLink): BuilderGraph {
    return BuilderGraph.parse({
      ...this.definition(),
      externalLinks: [...this.externalLinks, link],
    })
  }

  private definition(): BuilderGraphDefinition {
    return {
      version: this.version,
      metadata: this.metadata,
      components: this.components,
      links: this.links,
      externalLinks: this.externalLinks,
    }
  }
}
