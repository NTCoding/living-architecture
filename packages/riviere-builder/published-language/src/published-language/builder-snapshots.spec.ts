import type {
  Component,
  CustomComponent,
} from '@living-architecture/riviere-schema-published-language/schema'
import {
  addSnapshotPolicy,
  addSnapshotUseCase,
  createSnapshotBuilder,
} from '../__fixtures__/builder-snapshot-fixtures'
import { RiviereBuilder } from './riviere-builder'
import { SnapshotMetadataError } from './riviere-graph-snapshot'

class ExpectedCustomComponentError extends Error {}
class ExpectedSnapshotValueError extends Error {}

class PrivatePolicy {
  #enabled = true

  enabled(): boolean {
    return this.#enabled
  }
}

class PolicyConfiguration {
  constructor(readonly enabled: boolean) {}
}

const specialMetadataFactories: readonly [string, () => object][] = [
  ['Date', () => new Date(0)],
  ['RegExp', () => /order/],
  ['Map', () => new Map()],
  ['Set', () => new Set()],
  ['ArrayBuffer', () => new ArrayBuffer(1)],
  ['ArrayBuffer view', () => new Uint8Array(1)],
]

function customComponent(components: readonly Component[]): CustomComponent {
  const component = components.find((component) => component.type === 'Custom')
  if (component === undefined) throw new ExpectedCustomComponentError()
  return component
}

function mapMetadata(value: unknown): Map<unknown, unknown> {
  if (value instanceof Map) return value
  throw new ExpectedSnapshotValueError()
}

function setMetadata(value: unknown): Set<unknown> {
  if (value instanceof Set) return value
  throw new ExpectedSnapshotValueError()
}

function dateMetadata(value: unknown): Date {
  if (value instanceof Date) return value
  throw new ExpectedSnapshotValueError()
}

function typedArrayMetadata(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  throw new ExpectedSnapshotValueError()
}

function regularExpressionMetadata(value: unknown): RegExp {
  if (value instanceof RegExp) return value
  throw new ExpectedSnapshotValueError()
}

function arrayMetadata(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  throw new ExpectedSnapshotValueError()
}

function arrayBufferMetadata(value: unknown): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value
  throw new ExpectedSnapshotValueError()
}

function objectMetadata(value: unknown): object {
  if (typeof value === 'object' && value !== null) return value
  throw new ExpectedSnapshotValueError()
}

function firstSnapshotValue<T>(values: readonly T[]): T {
  const value = values[0]
  if (value === undefined) throw new ExpectedSnapshotValueError()
  return value
}

function policyMetadata(builder: RiviereBuilder, property: string): unknown {
  return customComponent(builder.components())[property]
}

describe('RiviereBuilder snapshots', () => {
  it('returns an empty array when no external Links have accumulated', () => {
    expect(createSnapshotBuilder().externalLinks()).toStrictEqual([])
  })

  it('returns exact components when components have accumulated', () => {
    const builder = createSnapshotBuilder()
    const component = addSnapshotUseCase(builder)

    expect(builder.components()).toStrictEqual([component])
  })

  it('preserves Builder component state when a returned component is changed', () => {
    const builder = createSnapshotBuilder()
    const component = addSnapshotUseCase(builder)
    const returnedComponent = firstSnapshotValue(builder.components())

    returnedComponent.sourceLocation.filePath = 'src/changed.ts'

    expect(returnedComponent.sourceLocation.filePath).toBe('src/changed.ts')
    expect(builder.components()).toStrictEqual([component])
  })

  it('preserves Builder state through reflective changes to returned plain metadata', () => {
    const builder = createSnapshotBuilder()
    addSnapshotPolicy(builder, { policy: { enabled: true } })
    const returnedPolicy = objectMetadata(policyMetadata(builder, 'policy'))

    expect(Reflect.set(returnedPolicy, 'enabled', false)).toBe(true)
    expect(Reflect.defineProperty(returnedPolicy, 'owner', { value: 'security' })).toBe(true)
    expect({
      returnedPolicy,
      owner: Reflect.get(returnedPolicy, 'owner'),
    }).toStrictEqual({
      returnedPolicy: { enabled: false },
      owner: 'security',
    })
    expect(policyMetadata(builder, 'policy')).toStrictEqual({ enabled: true })
  })

  it('preserves nested Map metadata when a returned value is changed', () => {
    const builder = createSnapshotBuilder()
    addSnapshotPolicy(builder, {
      policies: new Map([['authorize', { owner: 'security' }]]),
    })
    const returnedPolicies = mapMetadata(policyMetadata(builder, 'policies'))
    const returnedPolicy = objectMetadata(returnedPolicies.get('authorize'))

    Reflect.set(returnedPolicy, 'owner', 'orders')

    expect(returnedPolicies).toStrictEqual(new Map([['authorize', { owner: 'orders' }]]))
    expect(policyMetadata(builder, 'policies')).toStrictEqual(
      new Map([['authorize', { owner: 'security' }]]),
    )
  })

  it('preserves nested Set metadata when a returned value is changed', () => {
    const builder = createSnapshotBuilder()
    addSnapshotPolicy(builder, { roles: new Set(['admin']) })
    const returnedRoles = setMetadata(policyMetadata(builder, 'roles'))

    returnedRoles.add('auditor')

    expect(returnedRoles).toStrictEqual(new Set(['admin', 'auditor']))
    expect(policyMetadata(builder, 'roles')).toStrictEqual(new Set(['admin']))
  })

  it('preserves nested Date metadata when a returned value is changed', () => {
    const builder = createSnapshotBuilder()
    addSnapshotPolicy(builder, { reviewedAt: new Date(0) })
    const returnedReview = dateMetadata(policyMetadata(builder, 'reviewedAt'))

    returnedReview.setTime(1)

    expect(returnedReview).toStrictEqual(new Date(1))
    expect(policyMetadata(builder, 'reviewedAt')).toStrictEqual(new Date(0))
  })

  it.each(specialMetadataFactories)(
    'preserves own properties on %s metadata',
    (_type, createMetadata) => {
      const builder = createSnapshotBuilder()
      const metadata = createMetadata()
      Reflect.defineProperty(metadata, 'owner', { value: { name: 'security' } })
      addSnapshotPolicy(builder, { metadata })
      const snapshot = objectMetadata(policyMetadata(builder, 'metadata'))
      const descriptor = Object.getOwnPropertyDescriptor(snapshot, 'owner')
      const owner = objectMetadata(Reflect.get(snapshot, 'owner'))

      expect(descriptor).toStrictEqual({
        value: { name: 'security' },
        enumerable: false,
        writable: false,
        configurable: false,
      })

      Reflect.set(owner, 'name', 'orders')

      expect(Reflect.get(owner, 'name')).toBe('orders')
      expect(
        Reflect.get(objectMetadata(policyMetadata(builder, 'metadata')), 'owner'),
      ).toStrictEqual({ name: 'security' })
    },
  )

  it.each(specialMetadataFactories)(
    'rejects unsupported own properties on %s metadata',
    (_type, createMetadata) => {
      const builder = createSnapshotBuilder()
      const metadata = createMetadata()
      Reflect.defineProperty(metadata, 'invalid', { value: () => 'metadata' })
      addSnapshotPolicy(builder, { metadata })

      expect(() => builder.components()).toThrow(SnapshotMetadataError)
      expect(() => builder.components()).toThrow('functions are not supported')
    },
  )

  it('preserves circular null-prototype metadata and standalone buffers', () => {
    const builder = createSnapshotBuilder()
    const circularPolicy: object = {}
    Reflect.setPrototypeOf(circularPolicy, null)
    Reflect.set(circularPolicy, 'self', circularPolicy)
    addSnapshotPolicy(builder, {
      absent: null,
      circularPolicy,
      checksum: new ArrayBuffer(1),
    })
    const returnedCircularPolicy = objectMetadata(policyMetadata(builder, 'circularPolicy'))
    const returnedChecksum = arrayBufferMetadata(policyMetadata(builder, 'checksum'))

    new Uint8Array(returnedChecksum)[0] = 9

    expect(Reflect.getPrototypeOf(returnedCircularPolicy)).toBe(null)
    expect(Reflect.get(returnedCircularPolicy, 'self')).toBe(returnedCircularPolicy)
    expect(new Uint8Array(returnedChecksum)).toStrictEqual(new Uint8Array([9]))
    expect({
      absent: policyMetadata(builder, 'absent'),
      checksum: new Uint8Array(arrayBufferMetadata(policyMetadata(builder, 'checksum'))),
    }).toStrictEqual({
      absent: null,
      checksum: new Uint8Array([0]),
    })
  })

  it('preserves regular expression metadata when a returned value is changed', () => {
    const builder = createSnapshotBuilder()
    addSnapshotPolicy(builder, { matcher: /order/gi })
    const matcher = regularExpressionMetadata(policyMetadata(builder, 'matcher'))
    matcher.lastIndex = 4

    expect(matcher.lastIndex).toBe(4)
    expect(policyMetadata(builder, 'matcher')).toStrictEqual(/order/gi)
  })

  it('preserves ArrayBuffer view topology while isolating returned metadata', () => {
    const builder = createSnapshotBuilder()
    const buffer = new Uint8Array([1, 2]).buffer
    addSnapshotPolicy(builder, {
      first: new Uint8Array(buffer, 0, 1),
      second: new Uint8Array(buffer, 1, 1),
    })
    const snapshot = customComponent(builder.components())
    const first = typedArrayMetadata(snapshot['first'])
    const second = typedArrayMetadata(snapshot['second'])

    first[0] = 9

    expect({
      sharesSnapshotBuffer: first.buffer === second.buffer,
      detachesSourceBuffer: first.buffer !== buffer,
      returnedFirst: first,
      returnedSecond: second,
      storedFirst: typedArrayMetadata(policyMetadata(builder, 'first')),
      storedSecond: typedArrayMetadata(policyMetadata(builder, 'second')),
    }).toStrictEqual({
      sharesSnapshotBuffer: true,
      detachesSourceBuffer: true,
      returnedFirst: new Uint8Array([9]),
      returnedSecond: new Uint8Array([2]),
      storedFirst: new Uint8Array([1]),
      storedSecond: new Uint8Array([2]),
    })
  })

  it('preserves every supported ArrayBuffer view type in returned metadata', () => {
    const builder = createSnapshotBuilder()
    addSnapshotPolicy(builder, {
      views: [
        new DataView(new ArrayBuffer(1)),
        new Int8Array(1),
        new Uint8Array(1),
        new Uint8ClampedArray(1),
        new Int16Array(1),
        new Uint16Array(1),
        new Int32Array(1),
        new Uint32Array(1),
        new Float32Array(1),
        new Float64Array(1),
        new BigInt64Array(1),
        new BigUint64Array(1),
      ],
    })

    expect(
      arrayMetadata(policyMetadata(builder, 'views')).map((view) =>
        Object.prototype.toString.call(view),
      ),
    ).toStrictEqual([
      '[object DataView]',
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]',
      '[object BigInt64Array]',
      '[object BigUint64Array]',
    ])
  })

  it.each([
    ['a Promise', Promise.resolve('pending'), 'Promise values are not supported'],
    ['a function', () => 'metadata', 'functions are not supported'],
    [
      'an accessor property',
      Object.defineProperty({}, 'value', { get: () => 'metadata' }),
      'accessor properties are not supported',
    ],
    [
      'a private-field class instance',
      new PrivatePolicy(),
      'custom class instances are not supported',
    ],
    [
      'a custom class instance',
      new PolicyConfiguration(true),
      'custom class instances are not supported',
    ],
    ['a SharedArrayBuffer', new SharedArrayBuffer(1), 'SharedArrayBuffer values are not supported'],
    [
      'a SharedArrayBuffer view',
      new Uint8Array(new SharedArrayBuffer(1)),
      'SharedArrayBuffer views are not supported',
    ],
    [
      'an unsupported Float16Array view',
      new Float16Array(1),
      'the ArrayBuffer view type is not supported',
    ],
  ])(
    'throws SnapshotMetadataError when metadata contains %s',
    (_description, metadata, message) => {
      const builder = createSnapshotBuilder()
      addSnapshotPolicy(builder, { metadata })

      expect(() => builder.components()).toThrow(SnapshotMetadataError)
      expect(() => builder.components()).toThrow(message)
    },
  )

  it('throws SnapshotMetadataError when metadata declares a property without a descriptor', () => {
    const builder = createSnapshotBuilder()
    const malformedMetadata = new Proxy(
      {},
      {
        ownKeys: () => ['missing'],
        getOwnPropertyDescriptor: () => undefined,
      },
    )
    addSnapshotPolicy(builder, { malformedMetadata })

    expect(() => builder.components()).toThrow(SnapshotMetadataError)
    expect(() => builder.components()).toThrow("property 'missing' has no descriptor")
  })
})
