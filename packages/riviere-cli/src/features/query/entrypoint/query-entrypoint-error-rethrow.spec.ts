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
    vi.doUnmock('../queries/list-components')
    vi.doUnmock('../queries/list-domains')
    vi.doUnmock('../queries/list-entry-points')
    vi.doUnmock('../queries/detect-orphans')
    vi.doUnmock('../queries/search-components')
    vi.doUnmock('../queries/trace-flow')
    vi.doUnmock('../../../platform/infra/cli/presentation/query-graph-load-error-handler')
  })

  it('rethrows unknown list-components errors', async () => {
    vi.doMock('../queries/list-components', () => ({
      ListComponents: class {
        execute() {
          throw new UnexpectedQueryEntrypointError('unexpected failure')
        }
      },
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'components', '--json'],
    )
  })

  it('rethrows unknown list-domains errors', async () => {
    vi.doMock('../queries/list-domains', () => ({
      ListDomains: class {
        execute() {
          throw new UnexpectedQueryEntrypointError('unexpected failure')
        }
      },
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'domains', '--json'],
    )
  })

  it('rethrows unknown list-entry-points errors', async () => {
    vi.doMock('../queries/list-entry-points', () => ({
      ListEntryPoints: class {
        execute() {
          throw new UnexpectedQueryEntrypointError('unexpected failure')
        }
      },
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'entry-points', '--json'],
    )
  })

  it('rethrows unknown orphan errors', async () => {
    vi.doMock('../queries/detect-orphans', () => ({
      DetectOrphans: class {
        execute() {
          throw new UnexpectedQueryEntrypointError('unexpected failure')
        }
      },
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'orphans', '--json'],
    )
  })

  it('rethrows unknown search errors', async () => {
    vi.doMock('../queries/search-components', () => ({
      SearchComponents: class {
        execute() {
          throw new UnexpectedQueryEntrypointError('unexpected failure')
        }
      },
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'search', 'term', '--json'],
    )
  })

  it('rethrows unknown trace errors', async () => {
    vi.doMock('../queries/trace-flow', () => ({
      TraceFlow: class {
        execute() {
          throw new UnexpectedQueryEntrypointError('unexpected failure')
        }
      },
    }))
    vi.doMock('../../../platform/infra/cli/presentation/query-graph-load-error-handler', () => ({handleQueryGraphLoadError: vi.fn(() => false),}))
    await expectRethrow(
      () => import('../../../shell/cli'),
      ['node', 'riviere', 'query', 'trace', 'orders:mod:api:test', '--json'],
    )
  })
})
