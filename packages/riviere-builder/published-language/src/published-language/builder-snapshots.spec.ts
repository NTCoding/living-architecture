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

class PolicyConfiguration {
  constructor(readonly enabled: boolean) {}
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

function objectMetadata(value: unknown): object {
  if (typeof value === 'object' && value !== null) return value
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

  it('returns components with function metadata', () => {
    const builder = createBuilder()
    const behavior = () => 'accepted metadata'
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
        behavior,
        steps: [{ name: 'authorize' }],
      },
    })

    expect(builder.components()).toStrictEqual([component])
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

    expect(Reflect.get(customComponent(builder.components()), 'policy')).toStrictEqual({
      enabled: true,
    })
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
