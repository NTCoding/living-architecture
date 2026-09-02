import {
  addSnapshotUseCase,
  createSnapshotBuilder,
} from '../__fixtures__/builder-snapshot-fixtures'

class ExpectedSnapshotValueError extends Error {}

function firstSnapshotValue<T>(values: readonly T[]): T {
  const value = values[0]
  if (value === undefined) throw new ExpectedSnapshotValueError()
  return value
}

describe('RiviereBuilder Link snapshots', () => {
  it('returns exact Link occurrences when Links have accumulated', () => {
    const builder = createSnapshotBuilder()
    const source = addSnapshotUseCase(builder)
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
    const builder = createSnapshotBuilder()
    const source = addSnapshotUseCase(builder)
    const link = builder.link({
      from: source.id,
      to: 'orders:domain:domainop:place-order',
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/place-order.ts',
      },
    })
    const returnedLink = firstSnapshotValue(builder.links())

    returnedLink.source = 'orders:checkout:usecase:changed'

    expect(returnedLink.source).toBe('orders:checkout:usecase:changed')
    expect(builder.links()).toStrictEqual([link])
  })

  it('returns exact external Links when external Links have accumulated', () => {
    const builder = createSnapshotBuilder()
    const source = addSnapshotUseCase(builder)
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
    const builder = createSnapshotBuilder()
    const source = addSnapshotUseCase(builder)
    const { link } = builder.linkExternal({
      from: source.id,
      target: {
        name: 'Payments API',
        repository: 'test/payments',
      },
    })
    const returnedLink = firstSnapshotValue(builder.externalLinks())

    returnedLink.target.name = 'Changed API'

    expect(returnedLink.target.name).toBe('Changed API')
    expect(builder.externalLinks()).toStrictEqual([link])
  })
})
