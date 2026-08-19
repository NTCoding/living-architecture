import type {
  Component,
  CustomTypeDefinition,
  DomainMetadata,
  ExternalLink,
  Link,
  RelationshipTypeDefinition,
  SourceInfo,
} from '@living-architecture/riviere-schema-published-language/schema'
import { LinkId } from '@living-architecture/riviere-schema-published-language/link-id'

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

function externalLinkKey(link: ExternalLink): string {
  const repo = link.target.repository === undefined ? '' : `|${link.target.repository}`
  const type = link.type === undefined ? '' : `|${link.type}`
  return `${link.source}|${link.target.name}${repo}${type}`
}

/** @riviere-role value-object */
export class BuilderGraph {
  declare private readonly brand: 'BuilderGraph'

  readonly version: string

  private _name: string | undefined
  private _description: string | undefined
  private _generated: string | undefined
  private readonly _sources: SourceInfo[] = []
  private readonly _domains: Record<string, DomainMetadata>
  private readonly _customTypes: Record<string, CustomTypeDefinition>
  private readonly _relationshipTypes: Record<string, RelationshipTypeDefinition>

  private readonly componentsById = new Map<string, Component>()
  private readonly componentIndexById = new Map<string, number>()
  private readonly componentObjects: Component[] = []

  private readonly linksById = new Map<string, Link>()
  private readonly linkObjects: Link[] = []

  private readonly externalLinksByKey = new Map<string, ExternalLink>()
  private readonly externalLinkObjects: ExternalLink[] = []

  private constructor(definition: BuilderGraphDefinition) {
    this.version = definition.version
    this._name = definition.metadata.name
    this._description = definition.metadata.description
    this._generated = definition.metadata.generated
    this._sources = [...definition.metadata.sources]
    this._domains = { ...definition.metadata.domains }
    this._customTypes = { ...definition.metadata.customTypes }
    this._relationshipTypes = { ...definition.metadata.relationshipTypes }

    for (const component of definition.components) {
      this.componentsById.set(component.id, component)
      this.componentIndexById.set(component.id, this.componentObjects.length)
      this.componentObjects.push(component)
    }

    for (const link of definition.links) {
      if (link.id !== undefined) {
        this.linksById.set(link.id, link)
      }
      this.linkObjects.push(link)
    }

    for (const externalLink of definition.externalLinks) {
      const key = externalLinkKey(externalLink)
      this.externalLinksByKey.set(key, externalLink)
      this.externalLinkObjects.push(externalLink)
    }
  }

  static parse(definition: BuilderGraphDefinition): BuilderGraph {
    return new BuilderGraph(definition)
  }

  get metadata(): BuilderGraphDefinition['metadata'] {
    return {
      ...(this._name !== undefined && { name: this._name }),
      ...(this._description !== undefined && { description: this._description }),
      ...(this._generated !== undefined && { generated: this._generated }),
      sources: this._sources,
      domains: this._domains,
      customTypes: this._customTypes,
      relationshipTypes: this._relationshipTypes,
    }
  }

  get components(): readonly Component[] {
    return this.componentObjects
  }

  get links(): readonly Link[] {
    return this.linkObjects
  }

  get externalLinks(): readonly ExternalLink[] {
    return this.externalLinkObjects
  }

  hasComponent(id: string): boolean {
    return this.componentsById.has(id)
  }

  getComponent(id: string): Component | undefined {
    return this.componentsById.get(id)
  }

  getComponentIndex(id: string): number {
    const index = this.componentIndexById.get(id)
    return index ?? -1
  }

  hasLink(id: string): boolean {
    return this.linksById.has(id)
  }

  hasLinkByParsedId(parsedId: string): boolean {
    for (const link of this.linkObjects) {
      if (LinkId.parseFromLink(link).toString() === parsedId) {
        return true
      }
    }
    return false
  }

  findExternalLink(link: ExternalLink): ExternalLink | undefined {
    return this.externalLinksByKey.get(externalLinkKey(link))
  }

  withSource(source: SourceInfo): BuilderGraph {
    this._sources.push(source)
    return this
  }

  withDomain(name: string, domain: DomainMetadata): BuilderGraph {
    this._domains[name] = domain
    return this
  }

  withCustomType(name: string, definition: CustomTypeDefinition): BuilderGraph {
    this._customTypes[name] = definition
    return this
  }

  withRelationshipType(name: string, definition: RelationshipTypeDefinition): BuilderGraph {
    Object.defineProperty(this._relationshipTypes, name, {
      value: definition,
      enumerable: true,
      configurable: true,
      writable: true,
    })
    return this
  }

  withComponent(component: Component): BuilderGraph {
    this.componentsById.set(component.id, component)
    this.componentIndexById.set(component.id, this.componentObjects.length)
    this.componentObjects.push(component)
    return this
  }

  withComponentAt(index: number, component: Component): BuilderGraph {
    const existing = this.componentObjects[index]
    if (existing !== undefined) {
      this.componentsById.delete(existing.id)
      this.componentIndexById.delete(existing.id)
    }
    this.componentObjects[index] = component
    this.componentsById.set(component.id, component)
    this.componentIndexById.set(component.id, index)
    return this
  }

  withLink(link: Link): BuilderGraph {
    if (link.id !== undefined) {
      this.linksById.set(link.id, link)
    }
    this.linkObjects.push(link)
    return this
  }

  withExternalLink(link: ExternalLink): BuilderGraph {
    const key = externalLinkKey(link)
    this.externalLinksByKey.set(key, link)
    this.externalLinkObjects.push(link)
    return this
  }
}
