import { RiviereBuilder } from './riviere-builder'

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

function addSource(builder: RiviereBuilder) {
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
    const component = addSource(builder)

    expect(builder.components()).toStrictEqual([component])
  })

  it('preserves Builder component state when a returned component is changed', () => {
    const builder = createBuilder()
    const component = addSource(builder)
    const snapshot = builder.components()

    for (const returnedComponent of snapshot)
      returnedComponent.sourceLocation.filePath = 'src/changed.ts'

    expect(builder.components()).toStrictEqual([component])
  })

  it('returns exact Link occurrences when Links have accumulated', () => {
    const builder = createBuilder()
    const source = addSource(builder)
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
    const source = addSource(builder)
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
    const source = addSource(builder)
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
    const source = addSource(builder)
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
