import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../../platform/__fixtures__/command-test-fixtures'
import { GraphCorruptedError } from './graph-corrupted-error'
import { GraphNotFoundError } from './graph-not-found-error'
import {
  ComponentListLoader,
  ComponentSearchLoader,
  DomainListLoader,
  EntryPointListLoader,
  OrphanListLoader,
} from './query-loaders'

describe('query loaders', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('loads each query-specific read from the persisted graph', async () => {
    await writeGraph(ctx.testDir)

    const domain = new DomainListLoader().load(undefined).domains[0]

    expect({
      componentList: new ComponentListLoader().load(undefined, undefined, undefined),
      componentSearch: new ComponentSearchLoader().load(undefined, 'order'),
      domain:
        domain === undefined
          ? undefined
          : {
              ...domain,
              componentCounts: { ...domain.componentCounts },
            },
      entryPoints: new EntryPointListLoader().load(undefined),
      orphans: new OrphanListLoader().load(undefined),
    }).toMatchObject({
      componentList: { components: [] },
      componentSearch: { components: [] },
      domain: {
        componentCounts: {
          API: 0,
          Custom: 0,
          DomainOp: 0,
          Event: 0,
          EventHandler: 0,
          UI: 0,
          UseCase: 0,
          total: 0,
        },
        description: 'Orders',
        name: 'orders',
        systemType: 'domain',
      },
      entryPoints: { entryPoints: [] },
      orphans: { orphans: [] },
    })
  })

  it('throws GraphCorruptedError for invalid JSON files', async () => {
    const graphDir = join(ctx.testDir, '.riviere')
    await mkdir(graphDir, { recursive: true })
    await writeFile(join(graphDir, 'graph.json'), '{invalid', 'utf-8')

    expect(() => new ComponentListLoader().load(undefined, undefined, undefined)).toThrow(
      GraphCorruptedError,
    )
  })

  it('throws GraphNotFoundError when graph file does not exist', () => {
    expect(() =>
      new ComponentListLoader().load(join(ctx.testDir, 'missing.json'), undefined, undefined),
    ).toThrow(GraphNotFoundError)
  })

  it('rejects a graph path outside the working directory', async () => {
    const outsideDirectory = await mkdtemp(join(tmpdir(), 'riviere-query-outside-'))
    const outsideGraphPath = join(outsideDirectory, '.riviere', 'graph.json')
    await writeGraph(outsideDirectory)

    try {
      expect(() => new ComponentListLoader().load(outsideGraphPath, undefined, undefined)).toThrow(
        GraphNotFoundError,
      )
    } finally {
      await rm(outsideDirectory, { recursive: true })
    }
  })
})

async function writeGraph(testDir: string): Promise<void> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  await writeFile(
    join(graphDir, 'graph.json'),
    JSON.stringify({
      components: [],
      links: [],
      metadata: {
        domains: {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
        },
      },
      version: '1.0',
    }),
    'utf-8',
  )
}
