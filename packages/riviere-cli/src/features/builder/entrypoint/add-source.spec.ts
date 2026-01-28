import {
  describe, it, expect 
} from 'vitest'
import {
  readFile, mkdir, writeFile 
} from 'node:fs/promises'
import { join } from 'node:path'
import { createProgram } from '../../../shell/cli'
import { CliErrorCode } from '../../../platform/infra/cli-presentation/error-codes'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
  createGraphWithSource,
} from '../../../platform/__fixtures__/command-test-fixtures'

describe('riviere builder add-source', () => {
  describe('command registration', () => {
    it('registers add-source command under builder', () => {
      const program = createProgram()
      const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder')
      const addSourceCmd = builderCmd?.commands.find((cmd) => cmd.name() === 'add-source')

      expect(addSourceCmd?.name()).toBe('add-source')
    })
  })

  describe('adding source to existing graph', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('adds source to graph metadata when graph exists', async () => {
      await createGraphWithSource(ctx.testDir, 'https://github.com/org/repo1')

      const program = createProgram()
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-source',
        '--repository',
        'https://github.com/org/repo2',
      ])

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json')
      const content = await readFile(graphPath, 'utf-8')
      const graph: unknown = JSON.parse(content)

      expect(graph).toMatchObject({
        metadata: {
          sources: [
            { repository: 'https://github.com/org/repo1' },
            { repository: 'https://github.com/org/repo2' },
          ],
        },
      })
    })

    it('outputs success JSON when --json flag provided', async () => {
      await createGraphWithSource(ctx.testDir, 'https://github.com/org/repo1')

      const program = createProgram()
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-source',
        '--repository',
        'https://github.com/org/repo2',
        '--json',
      ])

      expect(ctx.consoleOutput).toHaveLength(1)
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '')
      expect(output).toMatchObject({
        success: true,
        data: { repository: 'https://github.com/org/repo2' },
      })
    })
  })

  describe('error handling', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      const program = createProgram()
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-source',
        '--repository',
        'https://github.com/org/repo',
      ])

      const output = ctx.consoleOutput.join('\n')
      expect(output).toContain(CliErrorCode.GraphNotFound)
    })

    it('uses custom graph path when --graph provided', async () => {
      const customGraphPath = join(ctx.testDir, 'custom', 'graph.json')
      await mkdir(join(ctx.testDir, 'custom'), { recursive: true })
      const graph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo1' }],
          domains: {
            orders: {
              description: 'Orders',
              systemType: 'domain',
            },
          },
        },
        components: [],
        links: [],
      }
      await writeFile(customGraphPath, JSON.stringify(graph), 'utf-8')

      const program = createProgram()
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-source',
        '--repository',
        'https://github.com/org/repo2',
        '--graph',
        customGraphPath,
      ])

      const content = await readFile(customGraphPath, 'utf-8')
      const savedGraph: unknown = JSON.parse(content)
      expect(savedGraph).toMatchObject({
        metadata: {
          sources: [
            { repository: 'https://github.com/org/repo1' },
            { repository: 'https://github.com/org/repo2' },
          ],
        },
      })
    })
  })
})
