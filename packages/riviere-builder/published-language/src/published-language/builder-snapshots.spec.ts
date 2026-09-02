import type {
  Component,
  CustomComponent,
} from '@living-architecture/riviere-schema-published-language/schema'
import { RiviereBuilder } from './riviere-builder'
import { SnapshotMetadataError } from './riviere-graph-definition'

class ExpectedCustomComponentError extends Error {}
class ExpectedSnapshotValueError extends Error {}
class ExpectedMapMetadataError extends Error {}
class ExpectedSetMetadataError extends Error {}
class ExpectedDateMetadataError extends Error {}
class ExpectedTypedArrayMetadataError extends Error {}
class ExpectedRegularExpressionMetadataError extends Error {}
class ExpectedArrayMetadataError extends Error {}
class ExpectedArrayBufferMetadataError extends Error {}

class PrivatePolicy {
  #enabled = true

  enabled(): boolean {
    return this.#enabled
  }
}

class PolicyConfiguration {
  constructor(readonly enabled: boolean) {}
}

function customComponent(components: readonly Component[]): CustomComponent {
  const component = components.find((component) => component.type === 'Custom')
  if (component === undefined) throw new ExpectedCustomComponentError()
  return component
}

function mapMetadata(value: unknown): Map<unknown, unknown> {
  if (value instanceof Map) return value
  throw new ExpectedMapMetadataError()
}

function setMetadata(value: unknown): Set<unknown> {
  if (value instanceof Set) return value
  throw new ExpectedSetMetadataError()
}

function dateMetadata(value: unknown): Date {
  if (value instanceof Date) return value
  throw new ExpectedDateMetadataError()
}

function typedArrayMetadata(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  throw new ExpectedTypedArrayMetadataError()
}

function regularExpressionMetadata(value: unknown): RegExp {
  if (value instanceof RegExp) return value
  throw new ExpectedRegularExpressionMetadataError()
}

function arrayMetadata(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  throw new ExpectedArrayMetadataError()
}

function arrayBufferMetadata(value: unknown): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value
  throw new ExpectedArrayBufferMetadataError()
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

function createBuilder(): RiviereBuilder {
  return RiviereBuilder.new({
    sources: [{ repository: 'test/repo', commit: 'abc123' }],
    domains: {
      orders: {
        description: 'Order domain',
        systemType: 'domain',
      },
    },
  })
}

function addPlaceOrderUseCase(builder: RiviereBuilder) {
  return builder.addUseCase({
    name: 'Place Order',
    domain: 'orders',
    module: 'checkout',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/place-order.ts',
    },
  })
}

function addPolicy(builder: RiviereBuilder, metadata: Readonly<Record<string, unknown>>): void {
  builder.defineCustomType({ name: 'Policy' })
  builder.addCustom({
    name: 'Order policy',
    domain: 'orders',
    module: 'checkout',
    customTypeName: 'Policy',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/order-policy.ts',
    },
    metadata,
  })
}

function policyMetadata(builder: RiviereBuilder, property: string): unknown {
  return customComponent(builder.components())[property]
}

describe('RiviereBuilder snapshots', () => {
  it('returns an empty array when no external Links have accumulated', () => {
    expect(createBuilder().externalLinks()).toStrictEqual([])
  })

  it('returns exact components when components have accumulated', () => {
    const builder = createBuilder()
    const component = addPlaceOrderUseCase(builder)

    expect(builder.components()).toStrictEqual([component])
  })

  it('preserves Builder component state when a returned component is changed', () => {
    const builder = createBuilder()
    const component = addPlaceOrderUseCase(builder)
    const returnedComponent = firstSnapshotValue(builder.components())

    returnedComponent.sourceLocation.filePath = 'src/changed.ts'

    expect(returnedComponent.sourceLocation.filePath).toBe('src/changed.ts')
    expect(builder.components()).toStrictEqual([component])
  })

  it('preserves Builder state through reflective changes to returned plain metadata', () => {
    const builder = createBuilder()
    addPolicy(builder, { policy: { enabled: true } })
    const returnedPolicy = objectMetadata(policyMetadata(builder, 'policy'))

    expect(Reflect.set(returnedPolicy, 'enabled', false)).toBe(true)
    expect(Reflect.defineProperty(returnedPolicy, 'owner', { value: 'security' })).toBe(true)
    expect({ returnedPolicy, owner: Reflect.get(returnedPolicy, 'owner') }).toStrictEqual({
      returnedPolicy: { enabled: false },
      owner: 'security',
    })
    expect(policyMetadata(builder, 'policy')).toStrictEqual({ enabled: true })
  })

  it('preserves nested Map, Set, and Date metadata when a returned value is changed', () => {
    const builder = createBuilder()
    addPolicy(builder, {
      policies: new Map([['authorize', { roles: new Set(['admin']), reviewedAt: new Date(0) }]]),
    })
    const returnedPolicies = mapMetadata(policyMetadata(builder, 'policies'))
    const returnedPolicy = objectMetadata(returnedPolicies.get('authorize'))
    const returnedRoles = setMetadata(Reflect.get(returnedPolicy, 'roles'))
    const returnedReview = dateMetadata(Reflect.get(returnedPolicy, 'reviewedAt'))

    returnedRoles.add('auditor')
    returnedReview.setTime(1)

    expect(returnedRoles).toStrictEqual(new Set(['admin', 'auditor']))
    expect(returnedReview).toStrictEqual(new Date(1))
    expect(policyMetadata(builder, 'policies')).toStrictEqual(
      new Map([['authorize', { roles: new Set(['admin']), reviewedAt: new Date(0) }]]),
    )
  })

  it('preserves circular null-prototype metadata and standalone buffers', () => {
    const builder = createBuilder()
    const circularPolicy: object = {}
    Reflect.setPrototypeOf(circularPolicy, null)
    Reflect.set(circularPolicy, 'self', circularPolicy)
    addPolicy(builder, { absent: null, circularPolicy, checksum: new ArrayBuffer(1) })
    const returnedCircularPolicy = objectMetadata(policyMetadata(builder, 'circularPolicy'))
    const returnedChecksum = arrayBufferMetadata(policyMetadata(builder, 'checksum'))

    new Uint8Array(returnedChecksum)[0] = 9

    expect(Reflect.getPrototypeOf(returnedCircularPolicy)).toBe(null)
    expect(Reflect.get(returnedCircularPolicy, 'self')).toBe(returnedCircularPolicy)
    expect(new Uint8Array(returnedChecksum)).toStrictEqual(new Uint8Array([9]))
    expect({
      absent: policyMetadata(builder, 'absent'),
      checksum: new Uint8Array(arrayBufferMetadata(policyMetadata(builder, 'checksum'))),
    }).toStrictEqual({ absent: null, checksum: new Uint8Array([0]) })
  })

  it('preserves regular expression metadata when a returned value is changed', () => {
    const builder = createBuilder()
    addPolicy(builder, { matcher: /order/gi })
    const matcher = regularExpressionMetadata(policyMetadata(builder, 'matcher'))
    matcher.lastIndex = 4

    expect(matcher.lastIndex).toBe(4)
    expect(policyMetadata(builder, 'matcher')).toStrictEqual(/order/gi)
  })

  it('preserves ArrayBuffer view topology while isolating returned metadata', () => {
    const builder = createBuilder()
    const buffer = new Uint8Array([1, 2]).buffer
    addPolicy(builder, {
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
    const builder = createBuilder()
    addPolicy(builder, {
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
      const builder = createBuilder()
      addPolicy(builder, { metadata })

      expect(() => builder.components()).toThrow(SnapshotMetadataError)
      expect(() => builder.components()).toThrow(message)
    },
  )

  it('throws SnapshotMetadataError when metadata declares a property without a descriptor', () => {
    const builder = createBuilder()
    const malformedMetadata = new Proxy(
      {},
      {
        ownKeys: () => ['missing'],
        getOwnPropertyDescriptor: () => undefined,
      },
    )
    addPolicy(builder, { malformedMetadata })

    expect(() => builder.components()).toThrow(SnapshotMetadataError)
    expect(() => builder.components()).toThrow("property 'missing' has no descriptor")
  })

  it('returns exact Link occurrences when Links have accumulated', () => {
    const builder = createBuilder()
    const source = addPlaceOrderUseCase(builder)
    const first = builder.link({
      from: source.id,
      to: 'orders:domain:domainop:place-order',
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/place-order.ts',
        lineNumber: 10,
        columnNumber: 1,
      },
    })
    const second = builder.link({
      from: source.id,
      to: 'orders:domain:domainop:place-order',
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/place-order.ts',
        lineNumber: 10,
        columnNumber: 20,
      },
    })

    expect(builder.links()).toStrictEqual([first, second])
  })

  it('preserves Builder Link state when a returned Link is changed', () => {
    const builder = createBuilder()
    const source = addPlaceOrderUseCase(builder)
    const link = builder.link({
      from: source.id,
      to: 'orders:domain:domainop:place-order',
      sourceLocation: { repository: 'test/repo', filePath: 'src/place-order.ts' },
    })
    const returnedLink = firstSnapshotValue(builder.links())

    returnedLink.source = 'orders:checkout:usecase:changed'

    expect(returnedLink.source).toBe('orders:checkout:usecase:changed')
    expect(builder.links()).toStrictEqual([link])
  })

  it('returns exact external Links when external Links have accumulated', () => {
    const builder = createBuilder()
    const source = addPlaceOrderUseCase(builder)
    const { link } = builder.linkExternal({
      from: source.id,
      target: { name: 'Payments API', repository: 'test/payments' },
      type: 'async',
    })

    expect(builder.externalLinks()).toStrictEqual([link])
  })

  it('preserves Builder external Link state when a returned target is changed', () => {
    const builder = createBuilder()
    const source = addPlaceOrderUseCase(builder)
    const { link } = builder.linkExternal({
      from: source.id,
      target: { name: 'Payments API', repository: 'test/payments' },
    })
    const returnedLink = firstSnapshotValue(builder.externalLinks())

    returnedLink.target.name = 'Changed API'

    expect(returnedLink.target.name).toBe('Changed API')
    expect(builder.externalLinks()).toStrictEqual([link])
  })
})
