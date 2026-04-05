import {
  mkdir, writeFile 
} from 'node:fs/promises'
import { join } from 'node:path'
import {
  describe, expect, it 
} from 'vitest'
import { createProgram } from '../../../shell/cli'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../platform/__fixtures__/command-test-fixtures'

async function createInvalidGraph(testDir: string): Promise<string> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  const graphPath = join(graphDir, 'graph.json')
  await writeFile(graphPath, '{invalid', 'utf-8')
  return graphPath
}

describe('builder entrypoint graph error coverage', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('maps GRAPH_NOT_FOUND for selected builder entrypoints', async () => {
    await createProgram().parseAsync([
      'node',
      'riviere',
      'builder',
      'add-source',
      '--repository',
      'https://github.com/org/repo',
      '--json',
    ])
    await createProgram().parseAsync(['node', 'riviere', 'builder', 'check-consistency', '--json'])
    await createProgram().parseAsync([
      'node',
      'riviere',
      'builder',
      'component-checklist',
      '--json',
    ])
    await createProgram().parseAsync(['node', 'riviere', 'builder', 'component-summary'])
    await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json'])

    expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.GraphNotFound)
  })

  it('maps GRAPH_CORRUPTED for selected builder entrypoints', async () => {
    await createInvalidGraph(ctx.testDir)

    await createProgram().parseAsync([
      'node',
      'riviere',
      'builder',
      'add-source',
      '--repository',
      'https://github.com/org/repo',
      '--json',
    ])
    await createProgram().parseAsync(['node', 'riviere', 'builder', 'check-consistency', '--json'])
    await createProgram().parseAsync([
      'node',
      'riviere',
      'builder',
      'component-checklist',
      '--json',
    ])
    await createProgram().parseAsync(['node', 'riviere', 'builder', 'component-summary'])
    await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json'])

    expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.GraphCorrupted)
  })
})
