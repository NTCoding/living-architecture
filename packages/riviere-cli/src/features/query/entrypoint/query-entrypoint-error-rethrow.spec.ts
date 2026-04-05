import {
  afterEach, describe, expect, it, vi 
} from 'vitest'

type Loader<T> = () => Promise<T>

class UnexpectedQueryEntrypointError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnexpectedQueryEntrypointError'
  }
}

async function expectRethrow<
  T extends { createProgram: () => { parseAsync: (argv: string[]) => Promise<unknown> } },
>(loadModule: Loader<T>, argv: string[]): Promise<void> {
  const module = await loadModule()
  await expect(module.createProgram().parseAsync(argv)).rejects.toThrow('unexpected failure')
}

describe('query entrypoints rethrow unknown errors', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.doUnmock('../commands/list-components')
    vi.doUnmock('../commands/list-domains')
    vi.doUnmock('../commands/list-entry-points')
    vi.doUnmock('../commands/detect-orphans')
    vi.doUnmock('../commands/search-components')
    vi.doUnmock('../commands/trace-flow')
    vi.doUnmock('../../../platform/infra/cli/presentation/query-graph-load-error-handler')
  })

  it('rethrows unknown list-components errors', async () => {
    vi.doMock('../commands/list-components', () => ({
      listComponents: vi.fn(() => {
        throw new UnexpectedQueryEntrypointError('unexpected failure')
      }),
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'components', '--json'],
    )
  })

  it('rethrows unknown list-domains errors', async () => {
    vi.doMock('../commands/list-domains', () => ({
      listDomains: vi.fn(() => {
        throw new UnexpectedQueryEntrypointError('unexpected failure')
      }),
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'domains', '--json'],
    )
  })

  it('rethrows unknown list-entry-points errors', async () => {
    vi.doMock('../commands/list-entry-points', () => ({
      listEntryPoints: vi.fn(() => {
        throw new UnexpectedQueryEntrypointError('unexpected failure')
      }),
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'entry-points', '--json'],
    )
  })

  it('rethrows unknown orphan errors', async () => {
    vi.doMock('../commands/detect-orphans', () => ({
      detectOrphans: vi.fn(() => {
        throw new UnexpectedQueryEntrypointError('unexpected failure')
      }),
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'orphans', '--json'],
    )
  })

  it('rethrows unknown search errors', async () => {
    vi.doMock('../commands/search-components', () => ({
      searchComponents: vi.fn(() => {
        throw new UnexpectedQueryEntrypointError('unexpected failure')
      }),
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'search', 'term', '--json'],
    )
  })

  it('rethrows unknown trace errors', async () => {
    vi.doMock('../commands/trace-flow', () => ({
      traceFlow: vi.fn(() => {
        throw new UnexpectedQueryEntrypointError('unexpected failure')
      }),
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'trace', 'orders:mod:api:test', '--json'],
    )
  })
})
