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
import { RiviereQueryRepository } from './riviere-query-repository'

describe('RiviereQueryRepository', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('returns GRAPH_CORRUPTED for invalid JSON files', async () => {
    const graphDir = join(ctx.testDir, '.riviere')
    await mkdir(graphDir, { recursive: true })
    await writeFile(join(graphDir, 'graph.json'), '{invalid', 'utf-8')

    expect(new RiviereQueryRepository().load()).toMatchObject({
      code: 'GRAPH_CORRUPTED',
      success: false,
    })
  })
})
