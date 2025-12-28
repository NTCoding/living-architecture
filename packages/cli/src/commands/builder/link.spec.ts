import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';

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
    const testContext: {
      testDir: string;
      originalCwd: string;
      consoleOutput: string[];
    } = {
      testDir: '',
      originalCwd: '',
      consoleOutput: [],
    };

    beforeEach(async () => {
      testContext.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'));
      testContext.originalCwd = process.cwd();
      testContext.consoleOutput = [];
      process.chdir(testContext.testDir);

      vi.spyOn(console, 'log').mockImplementation((msg: string) => {
        testContext.consoleOutput.push(msg);
      });
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      process.chdir(testContext.originalCwd);
      await rm(testContext.testDir, { recursive: true });
    });

    async function createGraphWithComponent(): Promise<void> {
      const graphDir = join(testContext.testDir, '.riviere');
      await mkdir(graphDir, { recursive: true });
      const graph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
            orders: { description: 'Order management', systemType: 'domain' },
          },
        },
        components: [
          {
            id: 'orders:checkout:api:create-order',
            type: 'API',
            name: 'Create Order',
            domain: 'orders',
            module: 'checkout',
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
            sourceLocation: { repository: 'https://github.com/org/repo', filePath: 'src/api/orders.ts' },
          },
        ],
        links: [],
      };
      await writeFile(join(graphDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
    }

    it('creates link when source component exists', async () => {
      await createGraphWithComponent();

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

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
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

      const output = testContext.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.GraphNotFound);
    });

    it('returns COMPONENT_NOT_FOUND with suggestions when source does not exist', async () => {
      await createGraphWithComponent();

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

      expect(testContext.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(testContext.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ComponentNotFound,
        },
      });
      expect(testContext.consoleOutput[0]).toContain('orders:checkout:api:create-order');
    });

    it('sets link type when --link-type async provided', async () => {
      await createGraphWithComponent();

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

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
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
      await createGraphWithComponent();

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

      expect(testContext.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(testContext.consoleOutput[0] ?? '');
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
      await createGraphWithComponent();

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

      expect(testContext.consoleOutput).toHaveLength(0);
      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({
        links: [{ source: 'orders:checkout:api:create-order', target: 'orders:checkout:usecase:place-order' }],
      });
    });

    it('propagates error when source ID format is malformed', async () => {
      await createGraphWithComponent();

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
        ])
      ).rejects.toThrow(/Invalid component ID format/);
    });

    it('returns VALIDATION_ERROR when component type is invalid', async () => {
      await createGraphWithComponent();

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

      expect(testContext.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(testContext.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
          message: 'Invalid component type: InvalidType',
        },
      });
    });

    it('returns VALIDATION_ERROR when link type is invalid', async () => {
      await createGraphWithComponent();

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

      expect(testContext.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(testContext.consoleOutput[0] ?? '');
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
