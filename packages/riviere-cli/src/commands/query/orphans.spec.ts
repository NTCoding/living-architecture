import { describe, it, expect } from 'vitest'
import { createProgram } from '../../cli'
import { CliErrorCode } from '../../error-codes'
import type { TestContext } from '../../command-test-fixtures'
import {
  createTestContext,
  setupCommandTest,
  createGraph,
  baseMetadata,
  apiComponent,
  useCaseComponent,
} from '../../command-test-fixtures'

interface OrphansSuccessOutput {
  success: true
  data: {
    orphans: string[]
  }
  warnings: string[]
}

interface OrphansErrorOutput {
  success: false
  error: {
    code: string
    message: string
    suggestions: string[]
  }
}

function isValidOrphansList(orphans: unknown): orphans is string[] {
  if (!Array.isArray(orphans)) return false
  return orphans.every((item): item is string => typeof item === 'string')
}

function isOrphansSuccessOutput(value: unknown): value is OrphansSuccessOutput {
  if (typeof value !== 'object' || value === null) return false
  if (!('success' in value) || value.success !== true) return false
  if (!('data' in value) || typeof value.data !== 'object') return false
  if (value.data === null || !('orphans' in value.data)) return false
  if (!isValidOrphansList(value.data.orphans)) return false
  if (!('warnings' in value) || !Array.isArray(value.warnings)) return false
  return true
}

function isOrphansErrorOutput(value: unknown): value is OrphansErrorOutput {
  if (typeof value !== 'object' || value === null) return false
  if (!('success' in value) || value.success !== false) return false
  if (!('error' in value) || typeof value.error !== 'object' || value.error === null) return false
  if (!('code' in value.error) || typeof value.error.code !== 'string') return false
  return true
}

function parseOutput(consoleOutput: string[]): OrphansSuccessOutput | OrphansErrorOutput {
  const parsed: unknown = JSON.parse(consoleOutput[0] ?? '{}')
  if (isOrphansSuccessOutput(parsed)) return parsed
  if (isOrphansErrorOutput(parsed)) return parsed
  throw new Error(`Invalid orphans output: ${consoleOutput[0]}`)
}

function assertSuccess(output: OrphansSuccessOutput | OrphansErrorOutput): OrphansSuccessOutput {
  if (isOrphansSuccessOutput(output)) {
    return output
  }
  throw new Error('Expected success output')
}

function getSortedOrphans(output: OrphansSuccessOutput): string[] {
  const orphans: string[] = output.data.orphans
  return [...orphans].sort((a, b) => a.localeCompare(b))
}

describe('riviere query orphans', () => {
  describe('command registration', () => {
    it('registers orphans command under query', () => {
      const program = createProgram()
      const queryCmd = program.commands.find((cmd) => cmd.name() === 'query')
      const orphansCmd = queryCmd?.commands.find((cmd) => cmd.name() === 'orphans')
      expect(orphansCmd?.name()).toBe('orphans')
    })
  })

  describe('detecting orphan components', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('returns components with no links as orphans', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent, useCaseComponent],
        links: [],
      })

      await createProgram().parseAsync(['node', 'riviere', 'query', 'orphans', '--json'])

      const output = assertSuccess(parseOutput(ctx.consoleOutput))

      expect(output.success).toBe(true)
      expect(getSortedOrphans(output)).toEqual([
        'orders:checkout:api:place-order',
        'orders:checkout:usecase:place-order',
      ])
    })

    it('returns empty array when all components are linked', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent, useCaseComponent],
        links: [
          {
            id: 'orders:checkout:api:place-order->orders:checkout:usecase:place-order',
            source: 'orders:checkout:api:place-order',
            target: 'orders:checkout:usecase:place-order',
            type: 'sync',
          },
        ],
      })

      await createProgram().parseAsync(['node', 'riviere', 'query', 'orphans', '--json'])

      const output = parseOutput(ctx.consoleOutput)

      if (!isOrphansSuccessOutput(output)) throw new Error('Expected success output')
      expect(output.data.orphans).toEqual([])
    })

    it('produces no output when --json flag is not provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent],
        links: [],
      })

      await createProgram().parseAsync(['node', 'riviere', 'query', 'orphans'])
      expect(ctx.consoleOutput).toHaveLength(0)
    })
  })

  describe('error handling', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync(['node', 'riviere', 'query', 'orphans', '--json'])

      const output = parseOutput(ctx.consoleOutput)
      if (!isOrphansErrorOutput(output)) throw new Error('Expected error output')

      expect(output.error.code).toBe(CliErrorCode.GraphNotFound)
    })
  })
})
