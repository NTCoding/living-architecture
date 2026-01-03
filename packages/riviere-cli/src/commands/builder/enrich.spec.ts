import { describe, it, expect } from 'vitest';
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
  simpleUseCaseComponent,
} from '../../command-test-fixtures';

describe('riviere builder enrich', () => {
  describe('command registration', () => {
    it('registers enrich command under builder', () => {
      const program = createProgram();
      const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder');
      const enrichCmd = builderCmd?.commands.find((cmd) => cmd.name() === 'enrich');

      expect(enrichCmd?.name()).toBe('enrich');
    });
  });

  describe('error handling', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'enrich',
        '--id',
        'orders:checkout:domainop:confirm-order',
      ]);

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.GraphNotFound);
    });

    it('returns COMPONENT_NOT_FOUND with suggestions when component does not exist', async () => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'enrich',
        '--id',
        'orders:checkout:domainop:confirm-ordr',
        '--entity',
        'Order',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ComponentNotFound,
          suggestions: ['orders:checkout:domainop:confirm-order'],
        },
      });
    });

    it('returns INVALID_COMPONENT_TYPE when component is not DomainOp', async () => {
      await createGraphWithComponent(ctx.testDir, simpleUseCaseComponent);
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'enrich',
        '--id',
        'orders:checkout:usecase:place-order',
        '--entity',
        'Order',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.InvalidComponentType,
        },
      });
    });

    it('returns VALIDATION_ERROR when state-change has no colon', async () => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'enrich',
        '--id',
        'orders:checkout:domainop:confirm-order',
        '--state-change',
        'invalid',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
        },
      });
    });

    it('returns VALIDATION_ERROR when state-change has too many colons', async () => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'enrich',
        '--id',
        'orders:checkout:domainop:confirm-order',
        '--state-change',
        'a:b:c',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
        },
      });
    });
  });

  describe('enriching components', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('enriches DomainOp with entity', async () => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'enrich',
        '--id',
        'orders:checkout:domainop:confirm-order',
        '--entity',
        'Order',
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({
        components: [{ id: 'orders:checkout:domainop:confirm-order', entity: 'Order' }],
      });
    });

    it('enriches DomainOp with state-change', async () => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'enrich',
        '--id',
        'orders:checkout:domainop:confirm-order',
        '--state-change',
        'pending:confirmed',
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({
        components: [{ stateChanges: [{ from: 'pending', to: 'confirmed' }] }],
      });
    });

    it('enriches DomainOp with multiple state-changes', async () => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'enrich',
        '--id',
        'orders:checkout:domainop:confirm-order',
        '--state-change',
        'pending:confirmed',
        '--state-change',
        'confirmed:shipped',
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({
        components: [
          {
            stateChanges: [
              { from: 'pending', to: 'confirmed' },
              { from: 'confirmed', to: 'shipped' },
            ],
          },
        ],
      });
    });

    it('enriches DomainOp with business-rule', async () => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'enrich',
        '--id',
        'orders:checkout:domainop:confirm-order',
        '--business-rule',
        'Order must have items',
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({
        components: [{ businessRules: ['Order must have items'] }],
      });
    });

    it('enriches DomainOp with multiple business-rules', async () => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'enrich',
        '--id',
        'orders:checkout:domainop:confirm-order',
        '--business-rule',
        'Rule 1',
        '--business-rule',
        'Rule 2',
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({
        components: [{ businessRules: ['Rule 1', 'Rule 2'] }],
      });
    });

    it('outputs success JSON when --json flag provided', async () => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'enrich',
        '--id',
        'orders:checkout:domainop:confirm-order',
        '--entity',
        'Order',
        '--json',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: true,
        data: { componentId: 'orders:checkout:domainop:confirm-order' },
      });
    });
  });

  describe('behavior options', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it.each([
      { name: 'single --reads', args: ['--reads', 'this.state'], expected: { reads: ['this.state'] } },
      {
        name: 'multiple --reads',
        args: ['--reads', 'this.state', '--reads', 'items parameter'],
        expected: { reads: ['this.state', 'items parameter'] },
      },
      {
        name: 'all behavior options',
        args: ['--reads', 'this.state', '--validates', 'state === Draft', '--modifies', 'this.state ← Placed', '--emits', 'order-placed event'],
        expected: { reads: ['this.state'], validates: ['state === Draft'], modifies: ['this.state ← Placed'], emits: ['order-placed event'] },
      },
    ])('enriches DomainOp with $name', async ({ args, expected }) => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync(['node', 'riviere', 'builder', 'enrich', '--id', 'orders:checkout:domainop:confirm-order', ...args]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({ components: [{ behavior: expected }] });
    });
  });

  describe('signature option', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it.each([
      {
        name: 'full signature with multiple parameters',
        input: 'orderId:string, amount:number -> Order',
        expected: {
          parameters: [
            { name: 'orderId', type: 'string' },
            { name: 'amount', type: 'number' },
          ],
          returnType: 'Order',
        },
      },
      {
        name: 'parameter with description',
        input: 'orderId:string:The order ID -> Order',
        expected: {
          parameters: [{ name: 'orderId', type: 'string', description: 'The order ID' }],
          returnType: 'Order',
        },
      },
      {
        name: 'parameters only (no return type)',
        input: 'orderId:string',
        expected: { parameters: [{ name: 'orderId', type: 'string' }] },
      },
      {
        name: 'return type only',
        input: '-> Order',
        expected: { returnType: 'Order' },
      },
    ])('parses $name', async ({ input, expected }) => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync([
        'node', 'riviere', 'builder', 'enrich',
        '--id', 'orders:checkout:domainop:confirm-order',
        '--signature', input,
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({ components: [{ signature: expected }] });
    });

    it.each([
      { name: 'no colon in parameter', input: 'invalid' },
      { name: 'empty parameter name', input: ':string -> Order' },
      { name: 'empty string', input: '' },
      { name: 'arrow with no return type', input: '->' },
    ])('returns VALIDATION_ERROR for $name', async ({ input }) => {
      await createGraphWithComponent(ctx.testDir, domainOpComponent);
      const program = createProgram();
      await program.parseAsync([
        'node', 'riviere', 'builder', 'enrich',
        '--id', 'orders:checkout:domainop:confirm-order',
        '--signature', input,
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: { code: CliErrorCode.ValidationError },
      });
    });
  });
});
