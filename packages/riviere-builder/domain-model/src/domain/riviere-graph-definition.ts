import type {
  CustomTypeDefinition,
  DomainMetadata,
  GraphMetadata as PublishedGraphMetadata,
  RelationshipTypeDefinition,
  SourceInfo,
} from '@living-architecture/riviere-schema-published-language/schema'
import {
  CustomTypeAlreadyDefinedError,
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateDomainError,
  MissingRequiredPropertiesError,
  RelationshipTypeAlreadyDefinedError,
  RelationshipTypeNotFoundError,
  SourceConflictError,
} from './construction/construction-errors'

type CompleteRiviereGraphDefinition = Readonly<{
  name?: string
  description?: string
  generated?: string
  sources: readonly SourceInfo[]
  domains: Readonly<Record<string, DomainMetadata>>
  customTypes: Readonly<Record<string, CustomTypeDefinition>>
  relationshipTypes: Readonly<Record<string, RelationshipTypeDefinition>>
}>

/** @riviere-role value-object */
export class RiviereGraphDefinition {
  declare private readonly brand: 'RiviereGraphDefinition'

  private constructor(private readonly value: CompleteRiviereGraphDefinition) {}

  static parse(metadata: PublishedGraphMetadata): RiviereGraphDefinition {
    return new RiviereGraphDefinition({
      ...(metadata.name === undefined ? {} : { name: metadata.name }),
      ...(metadata.description === undefined ? {} : { description: metadata.description }),
      ...(metadata.generated === undefined ? {} : { generated: metadata.generated }),
      sources: [...(metadata.sources ?? [])],
      domains: { ...metadata.domains },
      customTypes: { ...(metadata.customTypes ?? {}) },
      relationshipTypes: { ...(metadata.relationshipTypes ?? {}) },
    })
  }

  includingSource(source: SourceInfo): RiviereGraphDefinition {
    const existing = this.value.sources.find((item) => item.repository === source.repository)
    if (existing === undefined) return this.changed({ sources: [...this.value.sources, source] })
    if (sameSource(existing, source)) return this
    throw new SourceConflictError(source.repository)
  }

  includingDomain(name: string, domain: DomainMetadata): RiviereGraphDefinition {
    const existing = this.value.domains[name]
    if (existing === undefined)
      return this.changed({ domains: { ...this.value.domains, [name]: domain } })
    if (existing.description === domain.description && existing.systemType === domain.systemType)
      return this
    throw new DuplicateDomainError(name)
  }

  includingCustomType(name: string, definition: CustomTypeDefinition): RiviereGraphDefinition {
    if (Object.hasOwn(this.value.customTypes, name)) throw new CustomTypeAlreadyDefinedError(name)
    return this.changed({ customTypes: { ...this.value.customTypes, [name]: definition } })
  }

  includingRelationshipType(
    name: string,
    definition: RelationshipTypeDefinition,
  ): RiviereGraphDefinition {
    if (Object.hasOwn(this.value.relationshipTypes, name)) {
      throw new RelationshipTypeAlreadyDefinedError(name)
    }
    return this.changed({
      relationshipTypes: { ...this.value.relationshipTypes, [name]: definition },
    })
  }

  ensureDomainExists(name: string): void {
    if (!Object.hasOwn(this.value.domains, name)) throw new DomainNotFoundError(name)
  }

  ensureCustomTypeAccepts(
    name: string,
    properties: Readonly<Record<string, unknown>> | undefined,
  ): void {
    const definition = this.value.customTypes[name]
    if (definition === undefined) {
      throw new CustomTypeNotFoundError(name, Object.keys(this.value.customTypes))
    }
    const required = Object.keys(definition.requiredProperties ?? {})
    const missing = required.filter(
      (key) => properties === undefined || !Object.hasOwn(properties, key),
    )
    if (missing.length > 0) throw new MissingRequiredPropertiesError(name, missing)
  }

  ensureRelationshipTypeExists(name: string): void {
    if (!Object.hasOwn(this.value.relationshipTypes, name)) {
      throw new RelationshipTypeNotFoundError(name, Object.keys(this.value.relationshipTypes))
    }
  }

  published(): CompleteRiviereGraphDefinition {
    return this.value
  }

  private changed(change: Partial<CompleteRiviereGraphDefinition>): RiviereGraphDefinition {
    return new RiviereGraphDefinition({ ...this.value, ...change })
  }
}

function sameSource(existing: SourceInfo, incoming: SourceInfo): boolean {
  return (
    existing.repository === incoming.repository &&
    existing.commit === incoming.commit &&
    existing.extractedAt === incoming.extractedAt
  )
}
