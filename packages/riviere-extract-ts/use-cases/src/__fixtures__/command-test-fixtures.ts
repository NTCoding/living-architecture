import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, vi } from 'vitest'
import type { RiviereProjectCollaborators } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-event-catalog-source'

export function collaborators(): RiviereProjectCollaborators {
  return {
    loadEventCatalogSource: () => Promise.resolve({ domains: [], services: [], events: [] }),
    repositoryName: 'test',
  }
}

export interface TestContext {
  testDir: string
  originalCwd: string
}

export function createTestContext(): TestContext {
  return { originalCwd: '', testDir: '' }
}

export function setupCommandTest(ctx: TestContext): void {
  beforeEach(async () => {
    ctx.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'))
    ctx.originalCwd = process.cwd()
    process.chdir(ctx.testDir)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    process.chdir(ctx.originalCwd)
    await rm(ctx.testDir, { force: true, recursive: true })
  })
}

export async function createGraphWithDomain(testDir: string, domainName: string): Promise<void> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  await writeFile(
    join(graphDir, 'graph.json'),
    JSON.stringify({
      components: [],
      links: [],
      metadata: {
        domains: {
          [domainName]: { description: 'Test domain', systemType: 'domain' },
        },
        sources: [{ repository: 'https://github.com/org/repo' }],
      },
      version: '1.0',
    }),
    'utf-8',
  )
}
