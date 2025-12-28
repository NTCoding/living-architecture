import { describe, it, expect } from 'vitest';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import { type TestContext, createTestContext, setupCommandTest } from '../../command-test-fixtures';

async function createGraphWithDomainOp(testDir: string): Promise<void> {
  const graphDir = join(testDir, '.riviere');
  await mkdir(graphDir, { recursive: true });
  const graph = {
    version: '1.0',
    metadata: {
      sources: [{ repository: 'https://github.com/org/repo' }],
      domains: { orders: { description: 'Order management', systemType: 'domain' } },
    },
    components: [
      {
        id: 'orders:checkout:domainop:confirm-order',
        type: 'DomainOp',
        name: 'Confirm Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'confirmOrder',
        sourceLocation: { repository: 'https://github.com/org/repo', filePath: 'src/domain.ts' },
      },
    ],
    links: [],
  };
  await writeFile(join(graphDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
}

async function createGraphWithUseCase(testDir: string): Promise<void> {
  const graphDir = join(testDir, '.riviere');
  await mkdir(graphDir, { recursive: true });
  const graph = {
    version: '1.0',
    metadata: {
      sources: [{ repository: 'https://github.com/org/repo' }],
      domains: { orders: { description: 'Order management', systemType: 'domain' } },
    },
    components: [
      {
        id: 'orders:checkout:usecase:place-order',
        type: 'UseCase',
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: { repository: 'https://github.com/org/repo', filePath: 'src/usecase.ts' },
      },
    ],
    links: [],
  };
  await writeFile(join(graphDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
}

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
      await createGraphWithDomainOp(ctx.testDir);
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
      await createGraphWithUseCase(ctx.testDir);
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
      await createGraphWithDomainOp(ctx.testDir);
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
      await createGraphWithDomainOp(ctx.testDir);
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
      await createGraphWithDomainOp(ctx.testDir);
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
      await createGraphWithDomainOp(ctx.testDir);
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
      await createGraphWithDomainOp(ctx.testDir);
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
      await createGraphWithDomainOp(ctx.testDir);
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
      await createGraphWithDomainOp(ctx.testDir);
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
      await createGraphWithDomainOp(ctx.testDir);
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
});
