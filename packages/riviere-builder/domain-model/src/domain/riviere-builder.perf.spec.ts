import { RiviereBuilder } from './builder-facade'

const LARGE_GRAPH_SIZE = 80_000

function options() {
  return {
    sources: [{ repository: 'performance/repository', commit: 'abc123' }],
    domains: {
      performance: { description: 'Performance measurements', systemType: 'domain' },
    },
  } as const
}

describe('RiviereBuilder large graph performance paths', () => {
  it('stores 80,000 components without rebuilding the component collection', () => {
    const builder = RiviereBuilder.new(options())
    for (const index of Array.from({ length: LARGE_GRAPH_SIZE }, (_, item) => item)) {
      builder.addUseCase({
        name: `Component ${index}`,
        domain: 'performance',
        module: 'measurement',
        sourceLocation: {
          repository: 'performance/repository',
          filePath: 'src/components.ts',
          lineNumber: index + 1,
        },
      })
    }
    expect(builder.build().components).toHaveLength(LARGE_GRAPH_SIZE)
  })

  it('stores 80,000 links without rebuilding the link collection', () => {
    const builder = RiviereBuilder.new(options())
    const source = builder.addUseCase({
      name: 'Source',
      domain: 'performance',
      module: 'measurement',
      sourceLocation: { repository: 'performance/repository', filePath: 'src/source.ts' },
    })
    const target = builder.addUseCase({
      name: 'Target',
      domain: 'performance',
      module: 'measurement',
      sourceLocation: { repository: 'performance/repository', filePath: 'src/target.ts' },
    })
    for (const index of Array.from({ length: LARGE_GRAPH_SIZE }, (_, item) => item)) {
      builder.link({
        from: source.id,
        to: target.id,
        sourceLocation: {
          repository: 'performance/repository',
          filePath: 'src/links.ts',
          lineNumber: index + 1,
        },
      })
    }
    expect(builder.build().links).toHaveLength(LARGE_GRAPH_SIZE)
  })
})
