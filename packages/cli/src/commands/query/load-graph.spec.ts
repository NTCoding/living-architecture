import { describe, it, expect } from 'vitest'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { RiviereQuery } from '@living-architecture/riviere-query'
import { loadGraph, isLoadGraphError, withGraph } from './load-graph'
import { CliErrorCode } from '../../error-codes'
import type { TestContext } from '../../command-test-fixtures'
import { createTestContext, setupCommandTest } from '../../command-test-fixtures'

describe('load-graph', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  describe('loadGraph', () => {
    it('returns LoadGraphError when graph file does not exist', async () => {
      const result = await loadGraph()

      expect(isLoadGraphError(result)).toBe(true)
      if (isLoadGraphError(result)) {
        expect(result.error.error.code).toBe(CliErrorCode.GraphNotFound)
      }
    })

    it('returns LoadGraphError when graph file is not valid JSON', async () => {
      const graphDir = join(ctx.testDir, '.riviere')
      await mkdir(graphDir, { recursive: true })
      await writeFile(join(graphDir, 'graph.json'), 'not valid json', 'utf-8')

      const result = await loadGraph()

      expect(isLoadGraphError(result)).toBe(true)
      if (isLoadGraphError(result)) {
        expect(result.error.error.code).toBe(CliErrorCode.GraphCorrupted)
      }
    })

    it('returns RiviereQuery when graph file is valid', async () => {
      const graphDir = join(ctx.testDir, '.riviere')
      await mkdir(graphDir, { recursive: true })
      const validGraph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: { test: { description: 'Test domain', systemType: 'domain' } },
        },
        components: [],
        links: [],
      }
      await writeFile(join(graphDir, 'graph.json'), JSON.stringify(validGraph), 'utf-8')

      const result = await loadGraph()

      expect(isLoadGraphError(result)).toBe(false)
      if (!isLoadGraphError(result)) {
        expect(result.query).toBeInstanceOf(RiviereQuery)
        expect(result.graphPath).toContain('.riviere/graph.json')
      }
    })
  })

  describe('withGraph', () => {
    it('outputs error JSON when graph does not exist', async () => {
      await withGraph(undefined, () => {
        throw new Error('Handler should not be called')
      })

      expect(ctx.consoleOutput).toHaveLength(1)
      const firstOutput = ctx.consoleOutput[0]
      if (firstOutput === undefined) throw new Error('Expected output')
      const output: unknown = JSON.parse(firstOutput)
      expect(output).toMatchObject({
        success: false,
        error: { code: CliErrorCode.GraphNotFound },
      })
    })

    it('calls handler with query when graph exists', async () => {
      const graphDir = join(ctx.testDir, '.riviere')
      await mkdir(graphDir, { recursive: true })
      const validGraph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: { test: { description: 'Test domain', systemType: 'domain' } },
        },
        components: [],
        links: [],
      }
      await writeFile(join(graphDir, 'graph.json'), JSON.stringify(validGraph), 'utf-8')

      const handlerState = { called: false }
      await withGraph(undefined, (query) => {
        handlerState.called = true
        expect(query).toBeDefined()
      })

      expect(handlerState.called).toBe(true)
    })

    it('awaits async handlers', async () => {
      const graphDir = join(ctx.testDir, '.riviere')
      await mkdir(graphDir, { recursive: true })
      const validGraph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: { test: { description: 'Test domain', systemType: 'domain' } },
        },
        components: [],
        links: [],
      }
      await writeFile(join(graphDir, 'graph.json'), JSON.stringify(validGraph), 'utf-8')

      const asyncState = { completed: false }
      await withGraph(undefined, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        asyncState.completed = true
      })

      expect(asyncState.completed).toBe(true)
    })
  })

  describe('isLoadGraphError', () => {
    it('returns true when result has error property', async () => {
      const graphDir = join(ctx.testDir, '.riviere')
      await mkdir(graphDir, { recursive: true })
      await writeFile(join(graphDir, 'graph.json'), 'not valid json', 'utf-8')

      const result = await loadGraph()
      expect(isLoadGraphError(result)).toBe(true)
    })

    it('returns false when result has query property', async () => {
      const graphDir = join(ctx.testDir, '.riviere')
      await mkdir(graphDir, { recursive: true })
      const validGraph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: { test: { description: 'Test domain', systemType: 'domain' } },
        },
        components: [],
        links: [],
      }
      await writeFile(join(graphDir, 'graph.json'), JSON.stringify(validGraph), 'utf-8')

      const result = await loadGraph()
      expect(isLoadGraphError(result)).toBe(false)
    })
  })
})
