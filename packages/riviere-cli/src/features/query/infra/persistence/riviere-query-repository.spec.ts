import {
  mkdir, writeFile 
} from 'node:fs/promises'
import { join } from 'node:path'
import {
  describe, expect, it 
} from 'vitest'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../../platform/__fixtures__/command-test-fixtures'
import { GraphCorruptedError } from '../../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../../platform/domain/graph-not-found-error'
import { RiviereQueryRepository } from './riviere-query-repository'

describe('RiviereQueryRepository', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('throws GraphCorruptedError for invalid JSON files', async () => {
    const graphDir = join(ctx.testDir, '.riviere')
    await mkdir(graphDir, { recursive: true })
    await writeFile(join(graphDir, 'graph.json'), '{invalid', 'utf-8')

    expect(() => new RiviereQueryRepository().load()).toThrow(GraphCorruptedError)
  })

  it('throws GraphNotFoundError when graph file does not exist', () => {
    expect(() => new RiviereQueryRepository().load(join(ctx.testDir, 'missing.json'))).toThrow(
      GraphNotFoundError,
    )
  })
})
