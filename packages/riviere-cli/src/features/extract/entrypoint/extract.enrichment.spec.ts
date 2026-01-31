import {
  writeFile, mkdir 
} from 'node:fs/promises'
import { join } from 'node:path'
import {
  describe, it, expect 
} from 'vitest'
import { createProgram } from '../../../shell/cli'
import type { TestContext } from '../../../platform/__fixtures__/command-test-fixtures'
import {
  createTestContext,
  setupCommandTest,
  parseErrorOutput,
  TestAssertionError,
} from '../../../platform/__fixtures__/command-test-fixtures'

interface ComponentLocation {
  file: string
  line: number
}

interface DraftComponent {
  type: string
  name: string
  domain: string
  location: ComponentLocation
}

interface ExtractionOutput {
  success: true
  data: DraftComponent[]
}

function isExtractionOutput(value: unknown): value is ExtractionOutput {
  if (typeof value !== 'object' || value === null) return false
  if (!('success' in value) || value.success !== true) return false
  if (!('data' in value) || !Array.isArray(value.data)) return false
  return true
}

function parseExtractionOutput(consoleOutput: string[]): ExtractionOutput {
  const firstLine = consoleOutput[0]
  if (firstLine === undefined) {
    throw new TestAssertionError('Expected console output but got empty array')
  }
  const parsed: unknown = JSON.parse(firstLine)
  if (!isExtractionOutput(parsed)) {
    throw new TestAssertionError('Invalid extraction output')
  }
  return parsed
}

const validSourceCode = `
/** @useCase */
export class PlaceOrder {
  execute() {}
}
`

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

    it('outputs components with _missing array when extraction fields fail and --allow-incomplete provided', async () => {
      const configPath = await createExtractFixtureWithExtractBlock(ctx.testDir)

      await createProgram().parseAsync([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--allow-incomplete',
      ])

      const output = parseExtractionOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
      expect(output.data).toHaveLength(1)
      expect(output.data[0]).toMatchObject({ _missing: ['operationName'] })
    }, 15_000)

    it('exits with extraction failure code when extraction fields fail in strict mode', async () => {
      const configPath = await createExtractFixtureWithExtractBlock(ctx.testDir)

      await expect(
        createProgram().parseAsync(['node', 'riviere', 'extract', '--config', configPath]),
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

      await createProgram().parseAsync([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--enrich',
        draftPath,
      ])

      const output = parseExtractionOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
      expect(output.data).toHaveLength(1)
      expect(output.data[0]).toMatchObject({
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'orders',
        metadata: { category: 'command' },
      })
    }, 15_000)
  })
})
