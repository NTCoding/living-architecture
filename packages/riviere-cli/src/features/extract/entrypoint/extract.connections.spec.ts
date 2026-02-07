import {
  describe, it, expect, vi, afterEach 
} from 'vitest'
import type { TestContext } from '../../../platform/__fixtures__/command-test-fixtures'
import {
  createTestContext,
  setupCommandTest,
  assertDefined,
} from '../../../platform/__fixtures__/command-test-fixtures'
import { createProgram } from '../../../shell/cli'
import {
  parseFullExtractionOutput,
  createValidExtractFixture,
} from '../__fixtures__/extraction-test-fixtures'

vi.mock('../../../platform/infra/git/git-repository-info', () => ({
  getRepositoryInfo: vi.fn(() => ({
    name: 'test/repo',
    owner: 'test',
    url: 'https://github.com/test/repo.git',
  })),
}))

describe('riviere extract — connection detection', () => {
  afterEach(() => vi.restoreAllMocks())

  describe('output format', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('outputs components and empty links array when no connections exist', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)

      await createProgram().parseAsync(['node', 'riviere', 'extract', '--config', configPath])

      const output = parseFullExtractionOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
      expect(output.data.components).toHaveLength(1)
      expect(output.data.components[0]).toMatchObject({
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'orders',
      })
      expect(output.data.links).toStrictEqual([])
    })
  })

  describe('--components-only backward compatibility', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('outputs only component array when --components-only provided', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)

      await createProgram().parseAsync([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--components-only',
      ])

      const firstLine = assertDefined(ctx.consoleOutput[0])
      const parsed: unknown = JSON.parse(firstLine)
      expect(parsed).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            type: 'useCase',
            name: 'PlaceOrder',
          }),
        ]),
      })
    })
  })

  describe('--stats flag', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('outputs stats to stderr when --stats flag provided', async () => {
      const stderrOutput: string[] = []
      vi.spyOn(console, 'error').mockImplementation((msg: string) => stderrOutput.push(msg))

      const configPath = await createValidExtractFixture(ctx.testDir)

      await createProgram().parseAsync([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--stats',
      ])

      expect(stderrOutput.some((line) => line.startsWith('Components:'))).toBe(true)
      expect(stderrOutput.some((line) => line.startsWith('Links:'))).toBe(true)
    })
  })

  describe('timing output', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('outputs timing line to stderr when --stats provided', async () => {
      const stderrOutput: string[] = []
      vi.spyOn(console, 'error').mockImplementation((msg: string) => stderrOutput.push(msg))

      const configPath = await createValidExtractFixture(ctx.testDir)

      await createProgram().parseAsync([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--stats',
      ])

      expect(stderrOutput.some((line) => line.startsWith('Extraction completed in'))).toBe(true)
    })
  })

  describe('--patterns flag', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('accepts --patterns flag without error', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)

      await createProgram().parseAsync([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--patterns',
      ])

      const output = parseFullExtractionOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
    })
  })

  describe('empty components', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('outputs empty links when zero components extracted', async () => {
      const {
        writeFile, mkdir 
      } = await import('node:fs/promises')
      const { join } = await import('node:path')
      const srcDir = join(ctx.testDir, 'src')
      await mkdir(srcDir, { recursive: true })
      await writeFile(join(srcDir, 'empty.ts'), 'export const x = 1')
      const configPath = join(ctx.testDir, 'extract.yaml')
      await writeFile(
        configPath,
        `
modules:
  - name: orders
    path: "**/src/**/*.ts"
    api: { notUsed: true }
    useCase:
      find: classes
      where:
        hasJSDoc:
          tag: useCase
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    eventPublisher: { notUsed: true }
    ui: { notUsed: true }
`,
      )

      await createProgram().parseAsync(['node', 'riviere', 'extract', '--config', configPath])

      const output = parseFullExtractionOutput(ctx.consoleOutput)
      expect(output.data.components).toStrictEqual([])
      expect(output.data.links).toStrictEqual([])
    })
  })
})
