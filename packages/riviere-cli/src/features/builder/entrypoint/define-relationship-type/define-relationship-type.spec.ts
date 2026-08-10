import {
  describe, expect, it 
} from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createProgram } from '../../../../shell/cli'
import { CliErrorCode } from '../../../../platform/infra/cli/presentation/error-codes'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import {
  type TestContext,
  assertDefined,
  createGraphWithDomain,
  createTestContext,
  setupCommandTest,
} from '../../../../platform/__fixtures__/command-test-fixtures'

describe('riviere builder define-relationship-type', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('registers define-relationship-type under builder', () => {
    const program = createProgram()
    const builder = program.commands.find((command) => command.name() === 'builder')

    expect(builder?.commands.some((command) => command.name() === 'define-relationship-type')).toBe(
      true,
    )
  })

  it('stores the relationship type name and description', async () => {
    await createGraphWithDomain(ctx.testDir, 'orders')
    await createProgram().parseAsync([
      'node',
      'riviere',
      'builder',
      'define-relationship-type',
      '--name',
      'executes',
      '--description',
      'Invokes the target during execution',
    ])

    const graph = parseRiviereGraph(
      JSON.parse(await readFile(join(ctx.testDir, '.riviere', 'graph.json'), 'utf-8')),
    )
    expect(graph.metadata.relationshipTypes?.executes?.description).toBe(
      'Invokes the target during execution',
    )
  })

  it('outputs the defined relationship type as JSON', async () => {
    await createGraphWithDomain(ctx.testDir, 'orders')
    await createProgram().parseAsync([
      'node',
      'riviere',
      'builder',
      'define-relationship-type',
      '--name',
      'reads',
      '--description',
      'Reads data from the target',
      '--json',
    ])

    const output = assertDefined(ctx.consoleOutput[0], 'Expected JSON output')
    expect(JSON.parse(output)).toMatchObject({
      success: true,
      data: {
        name: 'reads',
        description: 'Reads data from the target',
      },
    })
  })

  it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
    await createProgram().parseAsync([
      'node',
      'riviere',
      'builder',
      'define-relationship-type',
      '--name',
      'reads',
      '--description',
      'Reads data from the target',
    ])

    expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.GraphNotFound)
  })

  it('returns VALIDATION_ERROR when the name already exists', async () => {
    await createGraphWithDomain(ctx.testDir, 'orders')
    const args = [
      'node',
      'riviere',
      'builder',
      'define-relationship-type',
      '--name',
      'reads',
      '--description',
      'Reads data from the target',
    ]
    await createProgram().parseAsync(args)
    await createProgram().parseAsync(args)

    expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.ValidationError)
  })
})
