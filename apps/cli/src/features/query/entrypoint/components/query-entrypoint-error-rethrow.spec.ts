import { afterEach, describe, expect, it, vi } from 'vitest'

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
    vi.doUnmock(
      '@living-architecture/riviere-builder-use-cases/features/query/queries/list-components',
    )
    vi.doUnmock(
      '@living-architecture/riviere-builder-use-cases/features/query/queries/list-domains',
    )
    vi.doUnmock(
      '@living-architecture/riviere-builder-use-cases/features/query/queries/list-entry-points',
    )
    vi.doUnmock(
      '@living-architecture/riviere-builder-use-cases/features/query/queries/detect-orphans',
    )
    vi.doUnmock(
      '@living-architecture/riviere-builder-use-cases/features/query/queries/search-components',
    )
    vi.doUnmock('@living-architecture/riviere-builder-use-cases/features/query/queries/trace-flow')
  })

  it('rethrows unknown list-components errors', async () => {
    vi.doMock(
      '@living-architecture/riviere-builder-use-cases/features/query/queries/list-components',
      () => ({
        ListComponents: class {
          execute() {
            throw new UnexpectedQueryEntrypointError('unexpected failure')
          }
        },
      }),
    )
    await expectRethrow(
      () => import('../../../../shell/cli'),
      ['node', 'riviere', 'query', 'components', '--json'],
    )
  })

  it('rethrows unknown list-domains errors', async () => {
    vi.doMock(
      '@living-architecture/riviere-builder-use-cases/features/query/queries/list-domains',
      () => ({
        ListDomains: class {
          execute() {
            throw new UnexpectedQueryEntrypointError('unexpected failure')
          }
        },
      }),
    )
    await expectRethrow(
      () => import('../../../../shell/cli'),
      ['node', 'riviere', 'query', 'domains', '--json'],
    )
  })

  it('rethrows unknown list-entry-points errors', async () => {
    vi.doMock(
      '@living-architecture/riviere-builder-use-cases/features/query/queries/list-entry-points',
      () => ({
        ListEntryPoints: class {
          execute() {
            throw new UnexpectedQueryEntrypointError('unexpected failure')
          }
        },
      }),
    )
    await expectRethrow(
      () => import('../../../../shell/cli'),
      ['node', 'riviere', 'query', 'entry-points', '--json'],
    )
  })

  it('rethrows unknown orphan errors', async () => {
    vi.doMock(
      '@living-architecture/riviere-builder-use-cases/features/query/queries/detect-orphans',
      () => ({
        DetectOrphans: class {
          execute() {
            throw new UnexpectedQueryEntrypointError('unexpected failure')
          }
        },
      }),
    )
    await expectRethrow(
      () => import('../../../../shell/cli'),
      ['node', 'riviere', 'query', 'orphans', '--json'],
    )
  })

  it('rethrows unknown search errors', async () => {
    vi.doMock(
      '@living-architecture/riviere-builder-use-cases/features/query/queries/search-components',
      () => ({
        SearchComponents: class {
          execute() {
            throw new UnexpectedQueryEntrypointError('unexpected failure')
          }
        },
      }),
    )
    await expectRethrow(
      () => import('../../../../shell/cli'),
      ['node', 'riviere', 'query', 'search', 'term', '--json'],
    )
  })

  it('rethrows unknown trace errors', async () => {
    vi.doMock(
      '@living-architecture/riviere-builder-use-cases/features/query/queries/trace-flow',
      () => ({
        TraceFlow: class {
          execute() {
            throw new UnexpectedQueryEntrypointError('unexpected failure')
          }
        },
      }),
    )
    await expectRethrow(
      () => import('../../../../shell/cli'),
      ['node', 'riviere', 'query', 'trace', 'orders:mod:api:test', '--json'],
    )
  })
})
