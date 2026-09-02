import type {
  Component,
  CustomComponent,
} from '@living-architecture/riviere-schema-published-language/schema'
import { RiviereBuilder } from './riviere-builder'

class ExpectedMapMetadataError extends Error {}
class ExpectedCustomComponentError extends Error {}
class ExpectedSetMetadataError extends Error {}
class ExpectedDateMetadataError extends Error {}
class ExpectedObjectMetadataError extends Error {}
class ExpectedRegularExpressionMetadataError extends Error {}
class ExpectedTypedArrayMetadataError extends Error {}
class ExpectedArrayBufferMetadataError extends Error {}

class PolicyConfiguration {
  readonly self: PolicyConfiguration

  constructor(readonly enabled: boolean) {
    this.self = this
    Object.defineProperty(this, 'label', {
      enumerable: true,
      get: () => 'policy',
    })
  }
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

function regularExpressionMetadata(value: unknown): RegExp {
  if (value instanceof RegExp) return value
  throw new ExpectedRegularExpressionMetadataError()
}

function typedArrayMetadata(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  throw new ExpectedTypedArrayMetadataError()
}

function arrayBufferMetadata(value: unknown): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value
  throw new ExpectedArrayBufferMetadataError()
}

function objectMetadata(value: unknown): object {
  if ((typeof value === 'object' && value !== null) || typeof value === 'function') return value
  throw new ExpectedObjectMetadataError()
}

function policyRoles(value: unknown): Set<unknown> {
  return setMetadata(Reflect.get(objectMetadata(value), 'roles'))
}

function customComponent(components: readonly Component[]): CustomComponent {
  const component = components.find((component) => component.type === 'Custom')
  if (component === undefined) throw new ExpectedCustomComponentError()
  return component
}

function createBuilder(): RiviereBuilder {
  return RiviereBuilder.new({
    sources: [
      {
        repository: 'test/repo',
        commit: 'abc123',
      },
    ],
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
    const snapshot = builder.components()

    for (const returnedComponent of snapshot)
      returnedComponent.sourceLocation.filePath = 'src/changed.ts'

    expect(builder.components()).toStrictEqual([component])
  })

  it('preserves Builder component state when returned function metadata is changed', () => {
    const builder = createBuilder()
    const behavior = () => 'accepted metadata'
    Reflect.set(behavior, 'self', behavior)
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
      metadata: {
        behavior,
        steps: [{ name: 'authorize' }],
        absent: null,
      },
    })

    const returnedBehavior = objectMetadata(customComponent(builder.components())['behavior'])
    Reflect.set(returnedBehavior, 'category', 'changed')

    expect(Reflect.get(returnedBehavior, 'self')).toBe(returnedBehavior)
    expect(
      Reflect.get(objectMetadata(customComponent(builder.components())['behavior']), 'category'),
    ).toBe(undefined)
  })

  it('throws when metadata declares a property without a descriptor', () => {
    const builder = createBuilder()
    const malformedMetadata = new Proxy(
      {},
      {
        ownKeys: () => ['missing'],
        getOwnPropertyDescriptor: () => undefined,
      },
    )
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
      metadata: { malformedMetadata },
    })

    expect(() => builder.components()).toThrow(
      `Expected property descriptor for 'missing'. Got undefined.`,
    )
  })

  it('preserves Builder component state when returned Map metadata is changed', () => {
    const builder = createBuilder()
    builder.defineCustomType({ name: 'Policy' })
    const component = builder.addCustom({
      name: 'Order policy',
      domain: 'orders',
      module: 'checkout',
      customTypeName: 'Policy',
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/order-policy.ts',
      },
      metadata: {
        policies: new Map([
          [
            'authorize',
            {
              enabled: true,
              roles: new Set(['admin']),
              reviewedAt: new Date(0),
            },
          ],
        ]),
      },
    })
    const policies = mapMetadata(customComponent(builder.components())['policies'])
    const policy = objectMetadata(policies.get('authorize'))
    const roles = policyRoles(policy)
    const reviewedAt = dateMetadata(Reflect.get(policy, 'reviewedAt'))
    roles.add('auditor')
    reviewedAt.setTime(1)

    expect(builder.components()).toStrictEqual([component])
  })

  it('preserves Builder component state when returned class metadata is changed', () => {
    const builder = createBuilder()
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
      metadata: {
        policy: new PolicyConfiguration(true),
      },
    })
    const policy = objectMetadata(customComponent(builder.components())['policy'])

    Reflect.set(policy, 'enabled', false)

    const preservedPolicy = objectMetadata(customComponent(builder.components())['policy'])

    expect(preservedPolicy).toBeInstanceOf(PolicyConfiguration)
    expect(Reflect.get(preservedPolicy, 'enabled')).toBe(true)
  })

  it('preserves Builder component state when returned regular expression metadata is changed', () => {
    const builder = createBuilder()
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
      metadata: { matcher: /order/gi },
    })
    const matcher = regularExpressionMetadata(customComponent(builder.components())['matcher'])
    matcher.lastIndex = 4

    expect(
      regularExpressionMetadata(customComponent(builder.components())['matcher']),
    ).toStrictEqual(/order/gi)
  })

  it('preserves Builder component state when returned typed array metadata is changed', () => {
    const builder = createBuilder()
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
      metadata: { priority: new Uint8Array([1]) },
    })
    const priority = typedArrayMetadata(customComponent(builder.components())['priority'])
    priority[0] = 2

    expect(typedArrayMetadata(customComponent(builder.components())['priority'])).toStrictEqual(
      new Uint8Array([1]),
    )
  })

  it('preserves Builder component state when returned array buffer metadata is changed', () => {
    const builder = createBuilder()
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
      metadata: { checksum: new Uint8Array([1]).buffer },
    })
    const checksum = arrayBufferMetadata(customComponent(builder.components())['checksum'])
    new Uint8Array(checksum)[0] = 2

    expect(
      new Uint8Array(arrayBufferMetadata(customComponent(builder.components())['checksum'])),
    ).toStrictEqual(new Uint8Array([1]))
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
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/place-order.ts',
      },
    })
    const snapshot = builder.links()

    for (const returnedLink of snapshot) returnedLink.source = 'orders:checkout:usecase:changed'

    expect(builder.links()).toStrictEqual([link])
  })

  it('returns exact external Links when external Links have accumulated', () => {
    const builder = createBuilder()
    const source = addPlaceOrderUseCase(builder)
    const { link } = builder.linkExternal({
      from: source.id,
      target: {
        name: 'Payments API',
        repository: 'test/payments',
      },
      type: 'async',
    })

    expect(builder.externalLinks()).toStrictEqual([link])
  })

  it('preserves Builder external Link state when a returned target is changed', () => {
    const builder = createBuilder()
    const source = addPlaceOrderUseCase(builder)
    const { link } = builder.linkExternal({
      from: source.id,
      target: {
        name: 'Payments API',
        repository: 'test/payments',
      },
    })
    const snapshot = builder.externalLinks()

    for (const returnedLink of snapshot) returnedLink.target.name = 'Changed API'

    expect(builder.externalLinks()).toStrictEqual([link])
  })
})
