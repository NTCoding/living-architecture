import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role domain-error */
export class SnapshotMetadataError extends Error {
  constructor(reason: string) {
    super(`Cannot create a detached metadata snapshot: ${reason}`)
    this.name = 'SnapshotMetadataError'
  }
}

/** @riviere-role value-object */
export class RiviereGraphSnapshot {
  declare private readonly brand: 'RiviereGraphSnapshot'

  private constructor(private readonly graph: RiviereGraph) {}

  static from(graph: RiviereGraph): RiviereGraphSnapshot {
    return new RiviereGraphSnapshot(clonePublishedObject(graph, new WeakMap<object, object>()))
  }

  published(): RiviereGraph {
    return this.graph
  }
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
  const snapshotExpression = structuredClone(publishedExpression)
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
  if (publishedView instanceof Int8Array)
    return new Int8Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  if (publishedView instanceof Uint8Array)
    return new Uint8Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  if (publishedView instanceof Uint8ClampedArray)
    return new Uint8ClampedArray(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  if (publishedView instanceof Int16Array)
    return new Int16Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  if (publishedView instanceof Uint16Array)
    return new Uint16Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  if (publishedView instanceof Int32Array)
    return new Int32Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  if (publishedView instanceof Uint32Array)
    return new Uint32Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  if (publishedView instanceof Float32Array)
    return new Float32Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
  if (publishedView instanceof Float64Array)
    return new Float64Array(snapshotBuffer, publishedView.byteOffset, publishedView.length)
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
