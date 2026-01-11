import {
  describe, it, expect 
} from 'vitest'
import { createProgram } from '../../cli'
import { CliErrorCode } from '../../error-codes'
import type { TestContext } from '../../command-test-fixtures'
import {
  createTestContext,
  setupCommandTest,
  createGraph,
  baseMetadata,
  sourceLocation,
  useCaseComponent,
  apiComponent,
  validLink,
  TestAssertionError,
} from '../../command-test-fixtures'

interface ValidationOutput {
  success: true
  data: {
    valid: boolean
    errors: Array<{
      code: string
      message: string
      path: string
    }>
    warnings: Array<{
      code: string
      message: string
      componentId?: string
      domainName?: string
    }>
  }
}

function isValidationOutput(value: unknown): value is ValidationOutput {
  if (typeof value !== 'object' || value === null) return false
  if (!('success' in value) || value.success !== true) return false
  if (!('data' in value) || typeof value.data !== 'object' || value.data === null) return false
  if (!('valid' in value.data) || typeof value.data.valid !== 'boolean') return false
  if (!('errors' in value.data) || !Array.isArray(value.data.errors)) return false
  return true
}

function parseOutput(consoleOutput: string[]): ValidationOutput {
  const parsed: unknown = JSON.parse(consoleOutput[0] ?? '{}')
  if (!isValidationOutput(parsed)) {
    throw new TestAssertionError('Invalid validation output')
  }
  return parsed
}

describe('riviere builder validate', () => {
  describe('command registration', () => {
    it('registers validate command under builder', () => {
      const program = createProgram()
      const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder')
      const validateCmd = builderCmd?.commands.find((cmd) => cmd.name() === 'validate')
      expect(validateCmd?.name()).toBe('validate')
    })
  })

  describe('validating a graph', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('returns valid=true with empty errors when graph is valid', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [useCaseComponent, apiComponent],
        links: [validLink],
      })

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json'])
      const output = parseOutput(ctx.consoleOutput)
      expect(output.data.valid).toBe(true)
      expect(output.data.errors).toHaveLength(0)
    })

    it('produces no output when --json flag is not provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [useCaseComponent, apiComponent],
        links: [validLink],
      })

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate'])
      expect(ctx.consoleOutput).toHaveLength(0)
    })

    it('returns valid=false with errors when graph has dangling link target', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent],
        links: [
          {
            ...validLink,
            target: 'orders:checkout:usecase:nonexistent',
          },
        ],
      })

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json'])
      const output = parseOutput(ctx.consoleOutput)
      expect(output.data.valid).toBe(false)
      expect(output.data.errors.some((e) => e.code === 'INVALID_LINK_TARGET')).toBe(true)
    })

    it('returns valid=false with errors when graph has dangling link source', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [useCaseComponent],
        links: [
          {
            ...validLink,
            source: 'orders:checkout:api:nonexistent',
          },
        ],
      })

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json'])
      const output = parseOutput(ctx.consoleOutput)
      expect(output.data.valid).toBe(false)
      expect(output.data.errors.some((e) => e.code === 'INVALID_LINK_SOURCE')).toBe(true)
    })

    it('returns valid=false with multiple errors for multiple issues', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [
          {
            id: 'x→y:sync',
            source: 'nonexistent:source',
            target: 'nonexistent:target',
            type: 'sync',
          },
        ],
      })

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json'])
      const output = parseOutput(ctx.consoleOutput)
      expect(output.data.valid).toBe(false)
      expect(output.data.errors.length).toBeGreaterThan(1)
    })

    it('includes warnings for orphan components in response', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [
          {
            ...useCaseComponent,
            id: 'orders:checkout:usecase:orphan',
            name: 'orphan',
            sourceLocation,
          },
        ],
        links: [],
      })

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json'])
      const output = parseOutput(ctx.consoleOutput)
      expect(output.data.valid).toBe(true)
      const orphanWarning = output.data.warnings.find((w) => w.code === 'ORPHAN_COMPONENT')
      expect(orphanWarning?.componentId).toBe('orders:checkout:usecase:orphan')
    })

    it('includes warnings for unused domains in response', async () => {
      const metadataWithUnused = {
        ...baseMetadata,
        domains: {
          ...baseMetadata.domains,
          payments: {
            description: 'Unused',
            systemType: 'domain',
          },
        },
      }

      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: metadataWithUnused,
        components: [useCaseComponent, apiComponent],
        links: [validLink],
      })

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json'])
      const output = parseOutput(ctx.consoleOutput)
      const unusedWarning = output.data.warnings.find((w) => w.code === 'UNUSED_DOMAIN')
      expect(unusedWarning?.domainName).toBe('payments')
    })
  })

  describe('JSON output (--json flag)', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('outputs success JSON with valid=true when graph is valid', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [],
      })

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json'])
      const output = parseOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
      expect(output.data.valid).toBe(true)
      expect(output.data.errors).toHaveLength(0)
    })

    it('outputs success JSON with valid=false and errors when graph is invalid', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [
          {
            id: 'x→y:sync',
            source: 'x',
            target: 'y',
            type: 'sync',
          },
        ],
      })

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json'])
      const output = parseOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
      expect(output.data.valid).toBe(false)
      expect(output.data.errors.length).toBeGreaterThan(0)
    })

    it('includes warnings array in success response', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [],
      })

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json'])
      const output = parseOutput(ctx.consoleOutput)
      expect(Array.isArray(output.data.warnings)).toBe(true)
    })
  })

  describe('error handling', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate'])
      expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.GraphNotFound)
    })

    it('uses custom graph path when --graph provided', async () => {
      const customPath = await createGraph(
        ctx.testDir,
        {
          version: '1.0',
          metadata: baseMetadata,
          components: [],
          links: [],
        },
        'custom',
      )

      await createProgram().parseAsync([
        'node',
        'riviere',
        'builder',
        'validate',
        '--graph',
        customPath,
        '--json',
      ])
      const output = parseOutput(ctx.consoleOutput)
      expect(output.data.valid).toBe(true)
    })
  })
})
