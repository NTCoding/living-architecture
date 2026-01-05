import {
  describe, it, expect 
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
} from '../../command-test-fixtures';

describe('riviere builder link', () => {
  describe('command registration', () => {
    it('registers link command under builder', () => {
      const program = createProgram();
      const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder');
      const linkCmd = builderCmd?.commands.find((cmd) => cmd.name() === 'link');

      expect(linkCmd?.name()).toBe('link');
    });
  });

  describe('creating links', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    const linkSourceComponent = {
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
    };

    it('creates link when source component exists', async () => {
      await createGraphWithComponent(ctx.testDir, linkSourceComponent);

      const program = createProgram();
      await program.parseAsync([
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
        '--json',
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        links: [
          {
            source: 'orders:checkout:api:create-order',
            target: 'orders:checkout:usecase:place-order',
          },
        ],
      });
    });

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      const program = createProgram();
      await program.parseAsync([
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
      ]);

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.GraphNotFound);
    });

    it('returns COMPONENT_NOT_FOUND with suggestions when source does not exist', async () => {
      await createGraphWithComponent(ctx.testDir, linkSourceComponent);

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'link',
        '--from',
        'orders:checkout:api:create-ordr',
        '--to-domain',
        'orders',
        '--to-module',
        'checkout',
        '--to-type',
        'UseCase',
        '--to-name',
        'place-order',
        '--json',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: { code: CliErrorCode.ComponentNotFound },
      });
      expect(ctx.consoleOutput[0]).toContain('orders:checkout:api:create-order');
    });

    it('sets link type when --link-type async provided', async () => {
      await createGraphWithComponent(ctx.testDir, linkSourceComponent);

      const program = createProgram();
      await program.parseAsync([
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
        '--link-type',
        'async',
        '--json',
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        links: [
          {
            source: 'orders:checkout:api:create-order',
            target: 'orders:checkout:usecase:place-order',
            type: 'async',
          },
        ],
      });
    });

    it('outputs success JSON with link details when --json flag provided', async () => {
      await createGraphWithComponent(ctx.testDir, linkSourceComponent);

      const program = createProgram();
      await program.parseAsync([
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
        '--json',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: true,
        data: {
          link: {
            source: 'orders:checkout:api:create-order',
            target: 'orders:checkout:usecase:place-order',
          },
        },
      });
    });

    it('creates link without output when --json not provided', async () => {
      await createGraphWithComponent(ctx.testDir, linkSourceComponent);

      const program = createProgram();
      await program.parseAsync([
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
      ]);

      expect(ctx.consoleOutput).toHaveLength(0);
      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({
        links: [
          {
            source: 'orders:checkout:api:create-order',
            target: 'orders:checkout:usecase:place-order',
          },
        ],
      });
    });

    it('propagates error when source ID format is malformed', async () => {
      await createGraphWithComponent(ctx.testDir, linkSourceComponent);

      const program = createProgram();

      await expect(
        program.parseAsync([
          'node',
          'riviere',
          'builder',
          'link',
          '--from',
          'malformed-id',
          '--to-domain',
          'orders',
          '--to-module',
          'checkout',
          '--to-type',
          'UseCase',
          '--to-name',
          'place-order',
        ]),
      ).rejects.toThrow(/Invalid component ID format/);
    });

    it('returns VALIDATION_ERROR when component type is invalid', async () => {
      await createGraphWithComponent(ctx.testDir, linkSourceComponent);

      const program = createProgram();
      await program.parseAsync([
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
        'InvalidType',
        '--to-name',
        'place-order',
        '--json',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
          message: 'Invalid component type: InvalidType',
        },
      });
    });

    it('returns VALIDATION_ERROR when link type is invalid', async () => {
      await createGraphWithComponent(ctx.testDir, linkSourceComponent);

      const program = createProgram();
      await program.parseAsync([
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
        '--link-type',
        'invalid',
        '--json',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
          message: 'Invalid link type: invalid',
        },
      });
    });
  });
});
