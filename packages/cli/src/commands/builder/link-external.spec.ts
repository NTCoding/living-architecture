import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';

describe('riviere builder link-external', () => {
  describe('command registration', () => {
    it('registers link-external command under builder', () => {
      const program = createProgram();
      const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder');
      const linkExternalCmd = builderCmd?.commands.find((cmd) => cmd.name() === 'link-external');

      expect(linkExternalCmd?.name()).toBe('link-external');
    });
  });

  describe('creating external links', () => {
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
            id: 'orders:checkout:api:pay',
            type: 'API',
            name: 'Pay',
            domain: 'orders',
            module: 'checkout',
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/payments',
            sourceLocation: { repository: 'https://github.com/org/repo', filePath: 'src/api/payments.ts' },
          },
        ],
        links: [],
        externalLinks: [],
      };
      await writeFile(join(graphDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
    }

    it('creates external link when source component exists', async () => {
      await createGraphWithComponent();

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'link-external',
        '--from',
        'orders:checkout:api:pay',
        '--target-name',
        'Stripe API',
        '--json',
      ]);

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        externalLinks: [
          {
            source: 'orders:checkout:api:pay',
            target: {
              name: 'Stripe API',
            },
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
        'link-external',
        '--from',
        'orders:checkout:api:pay',
        '--target-name',
        'Stripe API',
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
        'link-external',
        '--from',
        'orders:checkout:api:pa',
        '--target-name',
        'Stripe API',
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
    });

    it('includes optional target fields when provided', async () => {
      await createGraphWithComponent();

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'link-external',
        '--from',
        'orders:checkout:api:pay',
        '--target-name',
        'Stripe API',
        '--target-domain',
        'payments',
        '--target-url',
        'https://api.stripe.com',
        '--link-type',
        'async',
        '--json',
      ]);

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        externalLinks: [
          {
            source: 'orders:checkout:api:pay',
            target: {
              name: 'Stripe API',
              domain: 'payments',
              url: 'https://api.stripe.com',
            },
            type: 'async',
          },
        ],
      });
    });

    it('outputs success JSON with external link details when --json flag provided', async () => {
      await createGraphWithComponent();

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'link-external',
        '--from',
        'orders:checkout:api:pay',
        '--target-name',
        'Stripe API',
        '--json',
      ]);

      expect(testContext.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(testContext.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: true,
        data: {
          externalLink: {
            source: 'orders:checkout:api:pay',
            target: {
              name: 'Stripe API',
            },
          },
        },
      });
    });

    it('creates external link without output when --json not provided', async () => {
      await createGraphWithComponent();

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'link-external',
        '--from',
        'orders:checkout:api:pay',
        '--target-name',
        'Stripe API',
      ]);

      expect(testContext.consoleOutput).toHaveLength(0);
      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({
        externalLinks: [{ source: 'orders:checkout:api:pay', target: { name: 'Stripe API' } }],
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
          'link-external',
          '--from',
          'malformed-id',
          '--target-name',
          'Stripe API',
        ])
      ).rejects.toThrow(/Invalid component ID format/);
    });

    it('returns VALIDATION_ERROR when link type is invalid', async () => {
      await createGraphWithComponent();

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'link-external',
        '--from',
        'orders:checkout:api:pay',
        '--target-name',
        'Stripe API',
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
