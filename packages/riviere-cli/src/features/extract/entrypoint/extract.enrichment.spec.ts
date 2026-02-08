import {
  writeFile, mkdir 
} from 'node:fs/promises'
import { join } from 'node:path'
import {
  describe, it, expect 
} from 'vitest'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts'
import type { TestContext } from '../../../platform/__fixtures__/command-test-fixtures'
import {
  createTestContext,
  setupCommandTest,
  parseErrorOutput,
  parseCommandWithErrorHandling,
} from '../../../platform/__fixtures__/command-test-fixtures'
import {
  parseFullExtractionOutput,
  validSourceCode,
} from '../__fixtures__/extraction-test-fixtures'

vi.mock('../../../platform/infra/git/git-repository-info', () => ({
  getRepositoryInfo: vi.fn(() => ({
    name: 'test/repo',
    owner: 'test',
    url: 'https://github.com/test/repo.git',
  })),
}))

const configWithExtractBlock = `
modules:
  - name: orders
    path: "**/src/**/*.ts"
    api: { notUsed: true }
    useCase:
      find: classes
      where:
        hasJSDoc:
          tag: useCase
      extract:
        operationName:
          fromProperty:
            name: nonExistentProp
            kind: static
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    eventPublisher: { notUsed: true }
    ui: { notUsed: true }
`

const configWithLiteralExtract = `
modules:
  - name: orders
    path: "**/src/**/*.ts"
    api: { notUsed: true }
    useCase:
      find: classes
      where:
        hasJSDoc:
          tag: useCase
      extract:
        category:
          literal: command
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    eventPublisher: { notUsed: true }
    ui: { notUsed: true }
`

async function createExtractFixtureWithExtractBlock(testDir: string): Promise<string> {
  const srcDir = join(testDir, 'src')
  await mkdir(srcDir, { recursive: true })
  await writeFile(join(srcDir, 'order-service.ts'), validSourceCode)
  const configPath = join(testDir, 'extract.yaml')
  await writeFile(configPath, configWithExtractBlock)
  return configPath
}

describe('riviere extract enrichment', () => {
  describe('allow-incomplete flag', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('outputs components with _missing array when extraction fields fail and --allow-incomplete provided', async () => {
      const configPath = await createExtractFixtureWithExtractBlock(ctx.testDir)

      await parseCommandWithErrorHandling([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--allow-incomplete',
      ])

      const output = parseFullExtractionOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
      expect(output.data.components).toHaveLength(1)
      expect(output.data.components[0]).toMatchObject({ _missing: ['operationName'] })
    }, 15_000)

    it('exits with extraction failure code when extraction fields fail in strict mode', async () => {
      const configPath = await createExtractFixtureWithExtractBlock(ctx.testDir)

      await expect(
        parseCommandWithErrorHandling(['node', 'riviere', 'extract', '--config', configPath]),
      ).rejects.toMatchObject({ exitCode: 1 })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.success).toBe(false)
      expect(output.error.message).toContain('operationName')
    }, 15_000)
  })

  describe('enrich flag', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('reads draft components from file and enriches with extraction rules when --enrich provided', async () => {
      const srcDir = join(ctx.testDir, 'src')
      await mkdir(srcDir, { recursive: true })
      await writeFile(join(srcDir, 'order-service.ts'), validSourceCode)

      const configPath = join(ctx.testDir, 'extract.yaml')
      await writeFile(configPath, configWithLiteralExtract)

      const draftComponents: DraftComponent[] = [
        {
          type: 'useCase',
          name: 'PlaceOrder',
          domain: 'orders',
          location: {
            file: join(srcDir, 'order-service.ts'),
            line: 2,
          },
        },
      ]

      const draftPath = join(ctx.testDir, 'draft.json')
      await writeFile(draftPath, JSON.stringify(draftComponents))

      await parseCommandWithErrorHandling([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--enrich',
        draftPath,
      ])

      const output = parseFullExtractionOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
      expect(output.data.components).toHaveLength(1)
      expect(output.data.components[0]).toMatchObject({
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'orders',
        metadata: { category: 'command' },
      })
    }, 15_000)
  })
})
