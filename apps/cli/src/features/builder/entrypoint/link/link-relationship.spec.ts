import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseRiviereGraph } from '@living-architecture/riviere-schema/validation'
import { createProgram } from '../../../../shell/cli'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import {
  type TestContext,
  createGraphWithComponent,
  createTestContext,
  setupCommandTest,
} from '../../../../__fixtures__/command-test-fixtures'

function parseValidGraph(value: unknown) {
  const result = parseRiviereGraph(value)
  if (!result.success) {
    expect.fail(result.issues.join('\n'))
  }
  return result.graph
}

const sourceComponent = {
  id: 'orders:checkout:api:create-order',
  type: 'API',
  name: 'Create Order',
  domain: 'orders',
  module: 'checkout',
  apiType: 'REST',
  httpMethod: 'POST',
  path: '/orders',
  sourceLocation: {
    repository: 'https://github.com/org/repo',
    filePath: 'src/api/orders.ts',
  },
}

const baseLinkArgs = [
  'node',
  'riviere',
  'builder',
  'link',
  '--from',
  'orders:checkout:api:create-order',
  '--to-domain',
  'orders',
  '--to-module',
  'checkout',
  '--to-type',
  'UseCase',
  '--to-name',
  'place-order',
]

describe('riviere builder link relationship fields', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('stores relationship type, condition, source location, and generated Link ID', async () => {
    await createGraphWithComponent(ctx.testDir, sourceComponent)
    await createProgram().parseAsync([
      'node',
      'riviere',
      'builder',
      'define-relationship-type',
      '--name',
      'starts',
      '--description',
      'Begins execution at the target',
    ])
    await createProgram().parseAsync([
      ...baseLinkArgs,
      '--relationship-type',
      'starts',
      '--condition',
      'successful completion',
      '--repository',
      'https://github.com/org/repo',
      '--file-path',
      'src/api/orders.ts',
      '--line-number',
      '12',
      '--column-number',
      '5',
    ])

    const graph = parseValidGraph(
      JSON.parse(await readFile(join(ctx.testDir, '.riviere', 'graph.json'), 'utf-8')),
    )
    expect(graph.links).toStrictEqual([
      {
        id: 'orders:checkout:api:create-order->orders:checkout:usecase:place-order@src/api/orders.ts:12:5',
        source: 'orders:checkout:api:create-order',
        target: 'orders:checkout:usecase:place-order',
        relationshipType: 'starts',
        condition: 'successful completion',
        sourceLocation: {
          repository: 'https://github.com/org/repo',
          filePath: 'src/api/orders.ts',
          lineNumber: 12,
          columnNumber: 5,
        },
      },
    ])
  })

  it('returns VALIDATION_ERROR when a partial source location is supplied', async () => {
    await createGraphWithComponent(ctx.testDir, sourceComponent)

    await createProgram().parseAsync([...baseLinkArgs, '--line-number', '12'])

    expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.ValidationError)
    expect(ctx.consoleOutput.join('\n')).toContain('--repository and --file-path are required')
  })

  it.each(['0', String(Number.MAX_SAFE_INTEGER + 1)])(
    'returns VALIDATION_ERROR when source line is %s',
    async (lineNumber) => {
      await createGraphWithComponent(ctx.testDir, sourceComponent)

      await createProgram().parseAsync([
        ...baseLinkArgs,
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        'src/api/orders.ts',
        '--line-number',
        lineNumber,
      ])

      expect(ctx.consoleOutput.join('\n')).toContain('--line-number must be a positive integer')
    },
  )

  it('accepts a Link source location without line or column', async () => {
    await createGraphWithComponent(ctx.testDir, sourceComponent)

    await createProgram().parseAsync([
      ...baseLinkArgs,
      '--repository',
      'https://github.com/org/repo',
      '--file-path',
      'src/api/orders.ts',
    ])

    const graph = parseValidGraph(
      JSON.parse(await readFile(join(ctx.testDir, '.riviere', 'graph.json'), 'utf-8')),
    )
    expect(graph.links[0].sourceLocation).toStrictEqual({
      repository: 'https://github.com/org/repo',
      filePath: 'src/api/orders.ts',
    })
  })

  it.each(['0', String(Number.MAX_SAFE_INTEGER + 1)])(
    'returns VALIDATION_ERROR when source column is %s',
    async (columnNumber) => {
      await createGraphWithComponent(ctx.testDir, sourceComponent)

      await createProgram().parseAsync([
        ...baseLinkArgs,
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        'src/api/orders.ts',
        '--column-number',
        columnNumber,
      ])

      expect(ctx.consoleOutput.join('\n')).toContain('--column-number must be a positive integer')
    },
  )
})
