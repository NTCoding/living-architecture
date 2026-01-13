import {
  writeFile, mkdir 
} from 'node:fs/promises'
import { join } from 'node:path'
import {
  describe, it, expect 
} from 'vitest'
import { createProgram } from '../../cli'
import type { TestContext } from '../../command-test-fixtures'
import {
  createTestContext,
  setupCommandTest,
  parseErrorOutput,
  TestAssertionError,
} from '../../command-test-fixtures'
import { CliErrorCode } from '../../error-codes'

interface DraftComponent {
  type: string
  name: string
  domain: string
  location: {
    file: string
    line: number
  }
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

describe('riviere extract', () => {
  describe('command registration', () => {
    it('registers extract command at top level', () => {
      const program = createProgram()
      const extractCmd = program.commands.find((cmd) => cmd.name() === 'extract')
      expect(extractCmd?.name()).toBe('extract')
    })
  })

  describe('config file errors', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('returns error when config file does not exist', async () => {
      await expect(
        createProgram().parseAsync([
          'node',
          'riviere',
          'extract',
          '--config',
          './nonexistent.yaml',
        ]),
      ).rejects.toMatchObject({ exitCode: 1 })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.success).toBe(false)
      expect(output.error.code).toBe(CliErrorCode.ConfigNotFound)
      expect(output.error.message).toContain('nonexistent.yaml')
    })

    it('returns validation error when config file is invalid YAML', async () => {
      const configPath = join(ctx.testDir, 'invalid.yaml')
      await writeFile(configPath, 'invalid: yaml: content: [')

      await expect(
        createProgram().parseAsync(['node', 'riviere', 'extract', '--config', configPath]),
      ).rejects.toMatchObject({ exitCode: 1 })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.success).toBe(false)
      expect(output.error.code).toBe(CliErrorCode.ValidationError)
    })

    it('returns validation error when config schema is invalid', async () => {
      const configPath = join(ctx.testDir, 'invalid-schema.yaml')
      await writeFile(configPath, 'modules: "not an array"')

      await expect(
        createProgram().parseAsync(['node', 'riviere', 'extract', '--config', configPath]),
      ).rejects.toMatchObject({ exitCode: 1 })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.success).toBe(false)
      expect(output.error.code).toBe(CliErrorCode.ValidationError)
      expect(output.error.message).toContain('modules')
    })

    it('returns validation error when no files match glob patterns', async () => {
      const configPath = join(ctx.testDir, 'no-match.yaml')
      await writeFile(
        configPath,
        `
modules:
  - name: orders
    path: "**/*.nonexistent"
    api: { notUsed: true }
    useCase: { notUsed: true }
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }
`,
      )

      await expect(
        createProgram().parseAsync(['node', 'riviere', 'extract', '--config', configPath]),
      ).rejects.toMatchObject({ exitCode: 1 })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.success).toBe(false)
      expect(output.error.code).toBe(CliErrorCode.ValidationError)
      expect(output.error.message).toMatch(/No files matched.*\*\*\/\*\.nonexistent/)
    })
  })

  describe('$ref module references', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('expands $ref references before validation', async () => {
      const srcDir = join(ctx.testDir, 'src')
      await mkdir(srcDir, { recursive: true })

      const sourceFile = join(srcDir, 'order-service.ts')
      await writeFile(
        sourceFile,
        `
/** @useCase */
export class PlaceOrder {
  execute() {}
}
`,
      )

      const domainsDir = join(ctx.testDir, 'domains')
      await mkdir(domainsDir, { recursive: true })

      const ordersModule = join(domainsDir, 'orders.extraction.json')
      await writeFile(
        ordersModule,
        JSON.stringify({
          name: 'orders',
          path: '**/src/**/*.ts',
          api: { notUsed: true },
          useCase: {
            find: 'classes',
            where: { hasJSDoc: { tag: 'useCase' } },
          },
          domainOp: { notUsed: true },
          event: { notUsed: true },
          eventHandler: { notUsed: true },
          ui: { notUsed: true },
        }),
      )

      const configPath = join(ctx.testDir, 'extract.yaml')
      await writeFile(
        configPath,
        `
modules:
  - $ref: ./domains/orders.extraction.json
`,
      )

      await createProgram().parseAsync(['node', 'riviere', 'extract', '--config', configPath])

      const output = parseExtractionOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
      expect(output.data).toHaveLength(1)
      expect(output.data[0]).toMatchObject({
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'orders',
      })
    })
  })

  describe('successful extraction', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('extracts components from source files and outputs JSON', async () => {
      const srcDir = join(ctx.testDir, 'src')
      await mkdir(srcDir, { recursive: true })

      const sourceFile = join(srcDir, 'order-service.ts')
      await writeFile(
        sourceFile,
        `
/** @useCase */
export class PlaceOrder {
  execute() {}
}
`,
      )

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
    ui: { notUsed: true }
`,
      )

      await createProgram().parseAsync(['node', 'riviere', 'extract', '--config', configPath])

      const output = parseExtractionOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
      expect(output.data).toHaveLength(1)
      expect(output.data[0]).toMatchObject({
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'orders',
      })
    })
  })
})
