import {
  describe, it, expect 
} from 'vitest'
import { createProgram } from '../../../shell/cli'
import { CliErrorCode } from '../../../platform/infra/cli-presentation/error-codes'
import type { TestContext } from '../../../platform/__fixtures__/command-test-fixtures'
import {
  createTestContext,
  setupCommandTest,
  createGraph,
  baseMetadata,
  apiComponent,
  useCaseComponent,
  TestAssertionError,
} from '../../../platform/__fixtures__/command-test-fixtures'

interface TraceSuccessOutput {
  success: true
  data: {
    componentIds: string[]
    linkIds: string[]
  }
  warnings: string[]
}

interface TraceErrorOutput {
  success: false
  error: {
    code: string
    message: string
    suggestions: string[]
  }
}

type TraceOutput = TraceSuccessOutput | TraceErrorOutput

function isTraceSuccessOutput(value: unknown): value is TraceSuccessOutput {
  if (typeof value !== 'object' || value === null) return false
  if (!('success' in value) || value.success !== true) return false
  if (!('data' in value) || typeof value.data !== 'object' || value.data === null) return false
  if (!('componentIds' in value.data) || !Array.isArray(value.data.componentIds)) return false
  if (!('linkIds' in value.data) || !Array.isArray(value.data.linkIds)) return false
  return true
}

function isTraceErrorOutput(value: unknown): value is TraceErrorOutput {
  if (typeof value !== 'object' || value === null) return false
  if (!('success' in value) || value.success !== false) return false
  if (!('error' in value) || typeof value.error !== 'object' || value.error === null) return false
  if (!('code' in value.error) || typeof value.error.code !== 'string') return false
  return true
}

function parseOutput(consoleOutput: string[]): TraceOutput {
  const firstOutput = consoleOutput[0]
  if (firstOutput === undefined) {
    throw new TestAssertionError('Expected console output but got none')
  }
  const parsed: unknown = JSON.parse(firstOutput)
  if (isTraceSuccessOutput(parsed)) return parsed
  if (isTraceErrorOutput(parsed)) return parsed
  throw new TestAssertionError(`Invalid trace output: ${firstOutput}`)
}

function expectSuccessOutput(output: TraceOutput): TraceSuccessOutput {
  expect(output.success).toBe(true)
  if (!isTraceSuccessOutput(output)) throw new TestAssertionError('Type narrowing failed')
  return output
}

function expectErrorOutput(output: TraceOutput): TraceErrorOutput {
  expect(output.success).toBe(false)
  if (!isTraceErrorOutput(output)) throw new TestAssertionError('Type narrowing failed')
  return output
}

describe('riviere query trace', () => {
  describe('command registration', () => {
    it('registers trace command under query', () => {
      const program = createProgram()
      const queryCmd = program.commands.find((cmd) => cmd.name() === 'query')
      const traceCmd = queryCmd?.commands.find((cmd) => cmd.name() === 'trace')
      expect(traceCmd?.name()).toBe('trace')
    })
  })

  describe('tracing flow from component', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('returns componentIds and linkIds for connected components', async () => {
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

      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'trace',
        'orders:checkout:api:place-order',
        '--json',
      ])

      const output = expectSuccessOutput(parseOutput(ctx.consoleOutput))

      expect(new Set(output.data.componentIds)).toStrictEqual(
        new Set(['orders:checkout:api:place-order', 'orders:checkout:usecase:place-order']),
      )
      expect(output.data.linkIds).toStrictEqual([
        'orders:checkout:api:place-order->orders:checkout:usecase:place-order',
      ])
    })

    it('returns only starting component when isolated', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent],
        links: [],
      })

      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'trace',
        'orders:checkout:api:place-order',
        '--json',
      ])

      const output = expectSuccessOutput(parseOutput(ctx.consoleOutput))

      expect(output.data.componentIds).toStrictEqual(['orders:checkout:api:place-order'])
      expect(output.data.linkIds).toStrictEqual([])
    })

    it('produces no output when --json flag is not provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent],
        links: [],
      })

      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'trace',
        'orders:checkout:api:place-order',
      ])
      expect(ctx.consoleOutput).toHaveLength(0)
    })
  })

  describe('error handling', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'trace',
        'any:mod:type:component',
        '--json',
      ])

      const output = expectErrorOutput(parseOutput(ctx.consoleOutput))

      expect(output.error.code).toBe(CliErrorCode.GraphNotFound)
    })

    it('returns COMPONENT_NOT_FOUND with suggestions when component does not exist', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent, useCaseComponent],
        links: [],
      })

      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'trace',
        'orders:checkout:api:nonexistent',
        '--json',
      ])

      const output = expectErrorOutput(parseOutput(ctx.consoleOutput))

      expect(output.error.code).toBe(CliErrorCode.ComponentNotFound)
      expect(output.error.message).toContain('orders:checkout:api:nonexistent')
    })

    it('propagates unexpected errors thrown by traceFlow', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent],
        links: [],
      })

      const queryModule = await import('@living-architecture/riviere-query')
      const queryClass = queryModule.RiviereQuery
      const originalTraceFlow = queryClass.prototype.traceFlow

      queryClass.prototype.traceFlow = () => {
        throw new TestAssertionError('Unexpected internal error')
      }

      try {
        await expect(
          createProgram().parseAsync([
            'node',
            'riviere',
            'query',
            'trace',
            'orders:checkout:api:place-order',
            '--json',
          ]),
        ).rejects.toThrow('Unexpected internal error')
      } finally {
        queryClass.prototype.traceFlow = originalTraceFlow
      }
    })
  })
})
