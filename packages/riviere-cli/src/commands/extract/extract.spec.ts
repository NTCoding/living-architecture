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
  assertDefined,
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
    throw new Error('Expected console output but got empty array')
  }
  const parsed: unknown = JSON.parse(firstLine)
  if (!isExtractionOutput(parsed)) {
    throw new Error('Invalid extraction output')
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

  describe('dry-run mode', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('outputs component counts per domain when --dry-run flag provided', async () => {
      const srcDir = join(ctx.testDir, 'src')
      await mkdir(srcDir, { recursive: true })

      await writeFile(
        join(srcDir, 'order-service.ts'),
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

      await createProgram().parseAsync([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--dry-run',
      ])

      expect(ctx.consoleOutput[0]).toBe('orders: useCase(1)')
    })

    it('outputs counts for multiple component types when present', async () => {
      const srcDir = join(ctx.testDir, 'src')
      await mkdir(srcDir, { recursive: true })

      await writeFile(
        join(srcDir, 'order-service.ts'),
        `
/** @useCase */
export class PlaceOrder {
  execute() {}
}

/** @useCase */
export class CancelOrder {
  execute() {}
}

/** @api */
export class OrdersController {
  handleRequest() {}
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
    api:
      find: classes
      where:
        hasJSDoc:
          tag: api
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

      await createProgram().parseAsync([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--dry-run',
      ])

      expect(ctx.consoleOutput[0]).toBe('orders: api(1), useCase(2)')
    })

    it('outputs counts for each domain when multiple domains configured', async () => {
      const ordersDir = join(ctx.testDir, 'src/orders')
      const shippingDir = join(ctx.testDir, 'src/shipping')
      await mkdir(ordersDir, { recursive: true })
      await mkdir(shippingDir, { recursive: true })

      await writeFile(
        join(ordersDir, 'order-service.ts'),
        `
/** @useCase */
export class PlaceOrder {
  execute() {}
}
`,
      )

      await writeFile(
        join(shippingDir, 'shipping-service.ts'),
        `
/** @api */
export class ShippingController {
  handleRequest() {}
}
`,
      )

      const configPath = join(ctx.testDir, 'extract.yaml')
      await writeFile(
        configPath,
        `
modules:
  - name: orders
    path: "**/src/orders/**/*.ts"
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
  - name: shipping
    path: "**/src/shipping/**/*.ts"
    api:
      find: classes
      where:
        hasJSDoc:
          tag: api
    useCase: { notUsed: true }
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }
`,
      )

      await createProgram().parseAsync([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--dry-run',
      ])

      expect(ctx.consoleOutput).toContain('orders: useCase(1)')
      expect(ctx.consoleOutput).toContain('shipping: api(1)')
    })

    it('produces counts matching full extraction component array length', async () => {
      const srcDir = join(ctx.testDir, 'src')
      await mkdir(srcDir, { recursive: true })

      await writeFile(
        join(srcDir, 'order-service.ts'),
        `
/** @useCase */
export class PlaceOrder {
  execute() {}
}

/** @useCase */
export class CancelOrder {
  execute() {}
}

/** @api */
export class OrdersController {
  handleRequest() {}
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
    api:
      find: classes
      where:
        hasJSDoc:
          tag: api
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

      const fullOutput = parseExtractionOutput(ctx.consoleOutput)
      const fullCount = fullOutput.data.length
      ctx.consoleOutput.splice(0)

      await createProgram().parseAsync([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--dry-run',
      ])

      const dryRunLine = assertDefined(ctx.consoleOutput[0], 'Expected dry-run output')
      const matches = assertDefined(
        dryRunLine.match(/\((\d+)\)/g),
        'Expected count pattern in dry-run output',
      )
      const dryRunCount = matches.reduce((sum, match) => {
        const num = match.slice(1, -1)
        return sum + Number(num)
      }, 0)

      expect(dryRunCount).toBe(fullCount)
    })
  })
})
