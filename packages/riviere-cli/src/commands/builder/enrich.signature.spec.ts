import {
  describe,
  it,
  expect,
} from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
  createGraphWithComponent,
  domainOpComponent,
} from '../../command-test-fixtures';

describe('riviere builder enrich - signature option', () => {
  const ctx: TestContext = createTestContext();
  setupCommandTest(ctx);

  it.each([
    {
      name: 'full signature with multiple parameters',
      input: 'orderId:string, amount:number -> Order',
      expected: {
        parameters: [
          {
            name: 'orderId',
            type: 'string',
          },
          {
            name: 'amount',
            type: 'number',
          },
        ],
        returnType: 'Order',
      },
    },
    {
      name: 'parameter with description',
      input: 'orderId:string:The order ID -> Order',
      expected: {
        parameters: [
          {
            name: 'orderId',
            type: 'string',
            description: 'The order ID',
          },
        ],
        returnType: 'Order',
      },
    },
    {
      name: 'parameters only (no return type)',
      input: 'orderId:string',
      expected: {
        parameters: [{
          name: 'orderId',
          type: 'string',
        }],
      },
    },
    {
      name: 'return type only',
      input: '-> Order',
      expected: { returnType: 'Order' },
    },
  ])('parses $name', async ({
    input,
    expected,
  }) => {
    await createGraphWithComponent(ctx.testDir, domainOpComponent);
    const program = createProgram();
    await program.parseAsync([
      'node',
      'riviere',
      'builder',
      'enrich',
      '--id',
      'orders:checkout:domainop:confirm-order',
      '--signature',
      input,
    ]);

    const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
    const content = await readFile(graphPath, 'utf-8');
    const graph: unknown = JSON.parse(content);
    expect(graph).toMatchObject({ components: [{ signature: expected }] });
  });

  it.each([
    {
      name: 'no colon in parameter',
      input: 'invalid',
    },
    {
      name: 'empty parameter name',
      input: ':string -> Order',
    },
    {
      name: 'empty string',
      input: '',
    },
    {
      name: 'arrow with no return type',
      input: '->',
    },
  ])('returns VALIDATION_ERROR for $name', async ({ input }) => {
    await createGraphWithComponent(ctx.testDir, domainOpComponent);
    const program = createProgram();
    await program.parseAsync([
      'node',
      'riviere',
      'builder',
      'enrich',
      '--id',
      'orders:checkout:domainop:confirm-order',
      '--signature',
      input,
    ]);

    expect(ctx.consoleOutput).toHaveLength(1);
    const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
    expect(output).toMatchObject({
      success: false,
      error: { code: CliErrorCode.ValidationError },
    });
  });
});
