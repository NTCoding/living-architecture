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

/** @riviere-role domain-error */
export class SnapshotMetadataError extends Error {
  constructor(reason: string) {
    super(`Cannot create a detached metadata snapshot: ${reason}`)
    this.name = 'SnapshotMetadataError'
  }
}

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

function clonePublishedValue(publishedValue: unknown, clones: WeakMap<object, object>): unknown {
  if (typeof publishedValue !== 'object') return cloneNonObjectPublishedValue(publishedValue)
  if (publishedValue === null) return publishedValue
  return clonePublishedObjectValue(publishedValue, clones)
}

function cloneNonObjectPublishedValue(publishedValue: unknown): unknown {
  if (typeof publishedValue === 'function') {
    throw new SnapshotMetadataError('functions are not supported')
  }
  return publishedValue
}

function clonePublishedObjectValue(
  publishedObject: object,
  clones: WeakMap<object, object>,
): unknown {
  const existingClone = clones.get(publishedObject)
  if (existingClone !== undefined) return existingClone
  if (publishedObject instanceof Promise) {
    throw new SnapshotMetadataError('Promise values are not supported')
  }
  if (isSharedArrayBuffer(publishedObject)) {
    throw new SnapshotMetadataError('SharedArrayBuffer values are not supported')
  }
  if (publishedObject instanceof Date) return cloneDate(publishedObject, clones)
  if (publishedObject instanceof RegExp) return cloneRegularExpression(publishedObject, clones)
  if (publishedObject instanceof Map) return cloneMap(publishedObject, clones)
  if (publishedObject instanceof Set) return cloneSet(publishedObject, clones)
  if (publishedObject instanceof ArrayBuffer) return cloneArrayBuffer(publishedObject, clones)
  if (ArrayBuffer.isView(publishedObject)) return cloneArrayBufferView(publishedObject, clones)
  if (Array.isArray(publishedObject)) return cloneArray(publishedObject, clones)
  if (!isPlainObject(publishedObject)) {
    throw new SnapshotMetadataError('custom class instances are not supported')
  }
  return clonePublishedObject(publishedObject, clones)
}

function isSharedArrayBuffer(value: object): boolean {
  return typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer
}

function isPlainObject(value: object): boolean {
  const prototype = Reflect.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

function cloneDate(publishedDate: Date, clones: WeakMap<object, object>): Date {
  const snapshotDate = new Date(publishedDate)
  clones.set(publishedDate, snapshotDate)
  copyPublishedProperties(publishedDate, snapshotDate, clones)
  return snapshotDate
}

function cloneRegularExpression(
  publishedExpression: RegExp,
  clones: WeakMap<object, object>,
): RegExp {
  const snapshotExpression = new RegExp(publishedExpression.source, publishedExpression.flags)
  snapshotExpression.lastIndex = publishedExpression.lastIndex
  clones.set(publishedExpression, snapshotExpression)
  copyPublishedProperties(publishedExpression, snapshotExpression, clones)
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
  copyPublishedProperties(publishedMap, snapshotMap, clones)
  return snapshotMap
}

function cloneSet(publishedSet: Set<unknown>, clones: WeakMap<object, object>): Set<unknown> {
  const snapshotSet = new Set<unknown>()
  clones.set(publishedSet, snapshotSet)
  for (const nestedValue of publishedSet) snapshotSet.add(clonePublishedValue(nestedValue, clones))
  copyPublishedProperties(publishedSet, snapshotSet, clones)
  return snapshotSet
}

function cloneArrayBuffer(
  publishedBuffer: ArrayBuffer,
  clones: WeakMap<object, object>,
): ArrayBuffer {
  const snapshotBuffer = publishedBuffer.slice(0)
  clones.set(publishedBuffer, snapshotBuffer)
  copyPublishedProperties(publishedBuffer, snapshotBuffer, clones)
  return snapshotBuffer
}

function cloneArrayBufferView(
  publishedView: ArrayBufferView,
  clones: WeakMap<object, object>,
): ArrayBufferView {
  const snapshotBuffer = cloneViewBuffer(publishedView.buffer, clones)
  const snapshotView = cloneView(publishedView, snapshotBuffer)
  clones.set(publishedView, snapshotView)
  copyPublishedProperties(publishedView, snapshotView, clones)
  return snapshotView
}

function cloneViewBuffer(
  publishedBuffer: ArrayBufferLike,
  clones: WeakMap<object, object>,
): ArrayBuffer {
  if (publishedBuffer instanceof ArrayBuffer) {
    const existingClone = clones.get(publishedBuffer)
    if (existingClone instanceof ArrayBuffer) return existingClone
    return cloneArrayBuffer(publishedBuffer, clones)
  }
  throw new SnapshotMetadataError('SharedArrayBuffer views are not supported')
}

function cloneView(publishedView: ArrayBufferView, snapshotBuffer: ArrayBuffer): ArrayBufferView {
  if (publishedView instanceof DataView) {
    return new DataView(snapshotBuffer, publishedView.byteOffset, publishedView.byteLength)
  }
  return cloneTypedArray(publishedView, snapshotBuffer)
}

function cloneTypedArray(
  publishedView: Exclude<ArrayBufferView, DataView>,
  snapshotBuffer: ArrayBuffer,
) {
  if (publishedView instanceof BigInt64Array || publishedView instanceof BigUint64Array) {
    return cloneBigIntTypedArray(publishedView, snapshotBuffer)
  }
  if (publishedView instanceof Int8Array) {
    return new Int8Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  }
  if (publishedView instanceof Uint8Array) {
    return new Uint8Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  }
  if (publishedView instanceof Uint8ClampedArray) {
    return new Uint8ClampedArray(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  }
  if (publishedView instanceof Int16Array) {
    return new Int16Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  }
  if (publishedView instanceof Uint16Array) {
    return new Uint16Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  }
  if (publishedView instanceof Int32Array) {
    return new Int32Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  }
  if (publishedView instanceof Uint32Array) {
    return new Uint32Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  }
  if (publishedView instanceof Float32Array) {
    return new Float32Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  }
  if (publishedView instanceof Float64Array) {
    return new Float64Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  }
  throw new SnapshotMetadataError('the ArrayBuffer view type is not supported')
}

function cloneBigIntTypedArray(
  publishedView: BigInt64Array | BigUint64Array,
  snapshotBuffer: ArrayBuffer,
): BigInt64Array | BigUint64Array {
  if (publishedView instanceof BigInt64Array) {
    return new BigInt64Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  }
  return new BigUint64Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
}

function cloneArray(publishedArray: unknown[], clones: WeakMap<object, object>): unknown[] {
  const snapshotArray = new Array<unknown>(publishedArray.length)
  clones.set(publishedArray, snapshotArray)
  copyPublishedProperties(publishedArray, snapshotArray, clones)
  return snapshotArray
}

function clonePublishedObject(
  publishedObject: RiviereGraph,
  clones: WeakMap<object, object>,
): RiviereGraph
function clonePublishedObject(publishedObject: object, clones: WeakMap<object, object>): object
function clonePublishedObject(publishedObject: object, clones: WeakMap<object, object>): object {
  const snapshotObject: object = {}
  if (Reflect.getPrototypeOf(publishedObject) === null) Reflect.setPrototypeOf(snapshotObject, null)
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
    if (descriptor === undefined) {
      throw new SnapshotMetadataError(`property '${String(property)}' has no descriptor`)
    }
    Object.defineProperty(snapshotObject, property, clonePropertyDescriptor(descriptor, clones))
  }
}

function clonePropertyDescriptor(
  descriptor: PropertyDescriptor,
  clones: WeakMap<object, object>,
): PropertyDescriptor {
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new SnapshotMetadataError('accessor properties are not supported')
  }
  return {
    ...descriptor,
    value: clonePublishedValue(descriptor.value, clones),
  }
}
