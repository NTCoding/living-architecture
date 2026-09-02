import type {
  CustomTypeDefinition,
  Component as PublishedComponent,
  DomainMetadata,
  ExternalLink as PublishedExternalLink,
  GraphMetadata as PublishedGraphMetadata,
  Link as PublishedLink,
  RelationshipTypeDefinition,
  RiviereGraph,
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
} from './construction-errors'

type CompleteRiviereGraphDefinition = Readonly<{
  name: string | undefined
  description: string | undefined
  generated: string | undefined
  sources: readonly SourceInfo[]
  domains: Readonly<Record<string, DomainMetadata>>
  customTypes: Readonly<Record<string, CustomTypeDefinition>>
  relationshipTypes: Readonly<Record<string, RelationshipTypeDefinition>>
}>
type InspectionGraph = Readonly<{
  version: string
  metadata: CompleteRiviereGraphDefinition
  components: readonly PublishedComponent[]
  links: readonly PublishedLink[]
  externalLinks: readonly PublishedExternalLink[]
}>

/** @riviere-role value-object */
export class RiviereGraphDefinition {
  declare private readonly brand: 'RiviereGraphDefinition'

  private constructor(private readonly value: CompleteRiviereGraphDefinition) {}

  static parse(metadata: PublishedGraphMetadata): RiviereGraphDefinition {
    return new RiviereGraphDefinition({
      name: metadata.name,
      description: metadata.description,
      generated: metadata.generated,
      sources: [...(metadata.sources ?? [])],
      domains: { ...metadata.domains },
      customTypes: { ...metadata.customTypes },
      relationshipTypes: { ...metadata.relationshipTypes },
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
      return this.changed({
        domains: {
          ...this.value.domains,
          [name]: domain,
        },
      })
    if (existing.description === domain.description && existing.systemType === domain.systemType)
      return this
    throw new DuplicateDomainError(name)
  }

  includingCustomType(name: string, definition: CustomTypeDefinition): RiviereGraphDefinition {
    if (Object.hasOwn(this.value.customTypes, name)) throw new CustomTypeAlreadyDefinedError(name)
    return this.changed({
      customTypes: {
        ...this.value.customTypes,
        [name]: definition,
      },
    })
  }

  includingRelationshipType(
    name: string,
    definition: RelationshipTypeDefinition,
  ): RiviereGraphDefinition {
    if (Object.hasOwn(this.value.relationshipTypes, name)) {
      throw new RelationshipTypeAlreadyDefinedError(name)
    }
    return this.changed({
      relationshipTypes: {
        ...this.value.relationshipTypes,
        [name]: definition,
      },
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

  inspectionGraph(
    version: string,
    components: readonly PublishedComponent[],
    links: readonly PublishedLink[],
    externalLinks: readonly PublishedExternalLink[],
  ): InspectionGraph {
    return {
      version,
      metadata: this.published(),
      components,
      links,
      externalLinks,
    }
  }

  publishedGraph(
    version: string,
    components: readonly PublishedComponent[],
    links: readonly PublishedLink[],
    externalLinks: readonly PublishedExternalLink[],
  ): RiviereGraph {
    const customTypes = emptyRecord(this.value.customTypes)
    const relationshipTypes = emptyRecord(this.value.relationshipTypes)
    const graph: RiviereGraph = {
      version,
      metadata: {
        ...(this.value.name === undefined ? {} : { name: this.value.name }),
        ...(this.value.description === undefined ? {} : { description: this.value.description }),
        sources: [...this.value.sources],
        domains: { ...this.value.domains },
        ...(customTypes === undefined ? {} : { customTypes }),
        ...(relationshipTypes === undefined ? {} : { relationshipTypes }),
      },
      components: [...components],
      links: [...links],
      ...(externalLinks.length === 0 ? {} : { externalLinks: [...externalLinks] }),
    }
    return clonePublishedObject(graph, new WeakMap<object, object>())
  }

  private changed(change: Partial<CompleteRiviereGraphDefinition>): RiviereGraphDefinition {
    return new RiviereGraphDefinition({
      ...this.value,
      ...change,
    })
  }
}

function sameSource(existing: SourceInfo, incoming: SourceInfo): boolean {
  return (
    existing.repository === incoming.repository &&
    existing.commit === incoming.commit &&
    existing.extractedAt === incoming.extractedAt
  )
}

function emptyRecord<T>(
  record: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> | undefined {
  return Object.keys(record).length === 0 ? undefined : { ...record }
}

class MissingSnapshotPropertyDescriptorError extends Error {
  constructor(property: PropertyKey) {
    super(`Expected property descriptor for '${String(property)}'. Got undefined.`)
  }
}

function clonePublishedValue(publishedValue: unknown, clones: WeakMap<object, object>): unknown {
  if (typeof publishedValue !== 'object' && typeof publishedValue !== 'function') {
    return publishedValue
  }
  if (publishedValue === null) return publishedValue
  if (typeof publishedValue === 'function') return clonePublishedFunction(publishedValue, clones)
  return clonePublishedObjectValue(publishedValue, clones)
}

function clonePublishedObjectValue(
  publishedObject: object,
  clones: WeakMap<object, object>,
): unknown {
  const existingClone = clones.get(publishedObject)
  if (existingClone !== undefined) return existingClone
  if (publishedObject instanceof Date) return cloneDate(publishedObject, clones)
  if (publishedObject instanceof RegExp) return cloneRegularExpression(publishedObject, clones)
  if (publishedObject instanceof Map) return cloneMap(publishedObject, clones)
  if (publishedObject instanceof Set) return cloneSet(publishedObject, clones)
  if (publishedObject instanceof ArrayBuffer) return cloneArrayBuffer(publishedObject, clones)
  if (ArrayBuffer.isView(publishedObject)) return cloneArrayBufferView(publishedObject, clones)
  if (Array.isArray(publishedObject)) return cloneArray(publishedObject, clones)
  return clonePublishedObject(publishedObject, clones)
}

function clonePublishedFunction(
  publishedFunction: object,
  clones: WeakMap<object, object>,
): object {
  const existingClone = clones.get(publishedFunction)
  if (existingClone !== undefined) return existingClone
  const snapshotFunction = new Proxy(publishedFunction, {
    get(target, property, receiver) {
      return clonePublishedValue(Reflect.get(target, property, receiver), clones)
    },
    set() {
      return true
    },
  })
  clones.set(publishedFunction, snapshotFunction)
  return snapshotFunction
}

function cloneDate(publishedDate: Date, clones: WeakMap<object, object>): Date {
  const snapshotDate = new Date(publishedDate)
  clones.set(publishedDate, snapshotDate)
  return snapshotDate
}

function cloneRegularExpression(
  publishedExpression: RegExp,
  clones: WeakMap<object, object>,
): RegExp {
  const snapshotExpression = new RegExp(publishedExpression.source, publishedExpression.flags)
  snapshotExpression.lastIndex = publishedExpression.lastIndex
  clones.set(publishedExpression, snapshotExpression)
  return snapshotExpression
}

function cloneMap(
  publishedMap: Map<unknown, unknown>,
  clones: WeakMap<object, object>,
): Map<unknown, unknown> {
  const snapshotMap = new Map<unknown, unknown>()
  clones.set(publishedMap, snapshotMap)
  for (const [key, nestedValue] of publishedMap) {
    snapshotMap.set(clonePublishedValue(key, clones), clonePublishedValue(nestedValue, clones))
  }
  return snapshotMap
}

function cloneSet(publishedSet: Set<unknown>, clones: WeakMap<object, object>): Set<unknown> {
  const snapshotSet = new Set<unknown>()
  clones.set(publishedSet, snapshotSet)
  for (const nestedValue of publishedSet) snapshotSet.add(clonePublishedValue(nestedValue, clones))
  return snapshotSet
}

function cloneArrayBuffer(
  publishedBuffer: ArrayBuffer,
  clones: WeakMap<object, object>,
): ArrayBuffer {
  const snapshotBuffer = publishedBuffer.slice(0)
  clones.set(publishedBuffer, snapshotBuffer)
  return snapshotBuffer
}

function cloneArrayBufferView(
  publishedView: ArrayBufferView,
  clones: WeakMap<object, object>,
): ArrayBufferView {
  const snapshotView: ArrayBufferView = structuredClone(publishedView)
  clones.set(publishedView, snapshotView)
  return snapshotView
}

function cloneArray(publishedArray: unknown[], clones: WeakMap<object, object>): unknown[] {
  const snapshotArray = new Array<unknown>(publishedArray.length)
  clones.set(publishedArray, snapshotArray)
  copyPublishedProperties(publishedArray, snapshotArray, clones)
  return snapshotArray
}

function clonePublishedObject<T extends object>(
  publishedObject: T,
  clones: WeakMap<object, object>,
): T {
  const snapshotObject = { ...publishedObject }
  Object.setPrototypeOf(snapshotObject, Object.getPrototypeOf(publishedObject))
  clones.set(publishedObject, snapshotObject)
  copyPublishedProperties(publishedObject, snapshotObject, clones)
  return snapshotObject
}

function copyPublishedProperties(
  publishedObject: object,
  snapshotObject: object,
  clones: WeakMap<object, object>,
): void {
  for (const property of Reflect.ownKeys(publishedObject)) {
    const descriptor = Object.getOwnPropertyDescriptor(publishedObject, property)
    if (descriptor === undefined) throw new MissingSnapshotPropertyDescriptorError(property)
    Object.defineProperty(snapshotObject, property, clonePropertyDescriptor(descriptor, clones))
  }
}

function clonePropertyDescriptor(
  descriptor: PropertyDescriptor,
  clones: WeakMap<object, object>,
): PropertyDescriptor {
  if (!Object.hasOwn(descriptor, 'value')) return descriptor
  return {
    ...descriptor,
    value: clonePublishedValue(descriptor.value, clones),
  }
}
