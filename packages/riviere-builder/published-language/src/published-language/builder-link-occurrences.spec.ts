import { describe, expect, it } from 'vitest'
import { RiviereBuilder } from './riviere-builder'

function createBuilder(): RiviereBuilder {
  const options = {
    sources: [{ repository: 'test/repo' }],
    domains: {
      orders: {
        description: 'Order domain',
        systemType: 'domain',
      },
    },
  } as const
  return RiviereBuilder.new(options)
}

function addSource(builder: RiviereBuilder) {
  return builder.addUseCase({
    name: 'Create Order',
    domain: 'orders',
    module: 'checkout',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/create-order.ts',
    },
  })
}

function replaceFirstLinkId(graph: ReturnType<RiviereBuilder['build']>, id: string): void {
  graph.links = graph.links.map((link, index) =>
    index === 0
      ? {
          ...link,
          id,
        }
      : link,
  )
}

describe('RiviereBuilder Link occurrences', () => {
  it('rejects duplicate Links with the same source, target, and source location.', () => {
    const builder = createBuilder()
    const source = addSource(builder)
    const input = {
      from: source.id,
      to: 'any:target:id',
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/create-order.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    }
    builder.link(input)

    expect(() => builder.link(input)).toThrow(
      `Link with ID '${source.id}->any:target:id@src/create-order.ts:12:5' already exists`,
    )
  })

  it('generates a readable deterministic ID from the source occurrence', () => {
    const builder = createBuilder()
    const source = addSource(builder)

    const link = builder.link({
      from: source.id,
      to: 'any:target:id',
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/create-order.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    })

    expect(link.id).toBe(`${source.id}->any:target:id@src/create-order.ts:12:5`)
  })

  it('uses source and target as the ID for a legacy Link without source location', () => {
    const builder = createBuilder()
    const source = addSource(builder)

    const link = builder.link({
      from: source.id,
      to: 'any:target:id',
    })

    expect(link.id).toBe(`${source.id}->any:target:id`)
  })

  it('uses the file path when a source location has no line or column', () => {
    const builder = createBuilder()
    const source = addSource(builder)

    const link = builder.link({
      from: source.id,
      to: 'any:target:id',
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/create-order.ts',
      },
    })

    expect(link.id).toBe(`${source.id}->any:target:id@src/create-order.ts`)
  })

  it('uses an empty line segment when a source location has only a column', () => {
    const builder = createBuilder()
    const source = addSource(builder)

    const link = builder.link({
      from: source.id,
      to: 'any:target:id',
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/create-order.ts',
        columnNumber: 5,
      },
    })

    expect(link.id).toBe(`${source.id}->any:target:id@src/create-order.ts::5`)
  })

  it('uses the line when a source location has no column', () => {
    const builder = createBuilder()
    const source = addSource(builder)

    const link = builder.link({
      from: source.id,
      to: 'any:target:id',
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/create-order.ts',
        lineNumber: 12,
      },
    })

    expect(link.id).toBe(`${source.id}->any:target:id@src/create-order.ts:12`)
  })

  it('rejects a duplicate occurrence when a resumed Link has a different stored ID', () => {
    const builder = createBuilder()
    const source = addSource(builder)
    const input = {
      from: source.id,
      to: source.id,
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/create-order.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    }
    builder.link(input)
    const graph = builder.build()
    replaceFirstLinkId(graph, 'legacy-link-id')

    const resumed = RiviereBuilder.resume(graph)

    expect(() => resumed.link(input)).toThrow(
      `Link with ID '${source.id}->${source.id}@src/create-order.ts:12:5' already exists`,
    )
  })

  it('rejects a duplicate without a source location when a resumed Link has a different ID', () => {
    const builder = createBuilder()
    const source = addSource(builder)
    const input = {
      from: source.id,
      to: source.id,
    }
    builder.link(input)
    const graph = builder.build()
    replaceFirstLinkId(graph, 'legacy-link-id')

    const resumed = RiviereBuilder.resume(graph)

    expect(() => resumed.link(input)).toThrow(
      `Link with ID '${source.id}->${source.id}' already exists`,
    )
  })

  it('creates separate Links for different source columns', () => {
    const builder = createBuilder()
    const source = addSource(builder)
    const common = {
      from: source.id,
      to: 'any:target:id',
    }

    const first = builder.link({
      ...common,
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/create-order.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    })
    const second = builder.link({
      ...common,
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/create-order.ts',
        lineNumber: 12,
        columnNumber: 18,
      },
    })

    expect(first.id).toBe(`${source.id}->any:target:id@src/create-order.ts:12:5`)
    expect(second.id).toBe(`${source.id}->any:target:id@src/create-order.ts:12:18`)
  })

  it('retains relationship type and condition exactly as supplied', () => {
    const builder = createBuilder()
    builder.defineRelationshipType({
      name: 'starts',
      description: 'Begins execution at the target',
    })
    const source = addSource(builder)

    const link = builder.link({
      from: source.id,
      to: 'any:target:id',
      relationshipType: 'starts',
      condition: 'successful completion',
    })

    expect(link.relationshipType).toBe('starts')
    expect(link.condition).toBe('successful completion')
  })

  it('rejects an undefined relationship type', () => {
    const builder = createBuilder()
    const source = addSource(builder)

    expect(() =>
      builder.link({
        from: source.id,
        to: 'any:target:id',
        relationshipType: 'starts',
      }),
    ).toThrow("Relationship type 'starts' not defined. No relationship types have been defined.")
  })
})
