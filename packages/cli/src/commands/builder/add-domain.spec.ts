import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';

describe('riviere builder add-domain', () => {
  describe('command registration', () => {
    it('registers add-domain command under builder', () => {
      const program = createProgram();
      const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder');
      const addDomainCmd = builderCmd?.commands.find((cmd) => cmd.name() === 'add-domain');

      expect(addDomainCmd?.name()).toBe('add-domain');
    });
  });

  describe('adding domain to existing graph', () => {
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

    async function createGraphWithDomain(domainName: string): Promise<void> {
      const graphDir = join(testContext.testDir, '.riviere');
      await mkdir(graphDir, { recursive: true });
      const graph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: { [domainName]: { description: 'Existing domain', systemType: 'domain' } },
        },
        components: [],
        links: [],
      };
      await writeFile(join(graphDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
    }

    it('adds domain to graph metadata when graph exists', async () => {
      await createGraphWithDomain('orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-domain',
        '--name',
        'payments',
        '--description',
        'Payment processing',
        '--system-type',
        'bff',
      ]);

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        metadata: {
          domains: {
            orders: { description: 'Existing domain', systemType: 'domain' },
            payments: { description: 'Payment processing', systemType: 'bff' },
          },
        },
      });
    });

    it('outputs success JSON when --json flag provided', async () => {
      await createGraphWithDomain('orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-domain',
        '--name',
        'payments',
        '--description',
        'Payment processing',
        '--system-type',
        'domain',
        '--json',
      ]);

      expect(testContext.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(testContext.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: true,
        data: {
          name: 'payments',
          description: 'Payment processing',
          systemType: 'domain',
        },
      });
    });

    it('returns DUPLICATE_DOMAIN error when domain already exists', async () => {
      await createGraphWithDomain('orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-domain',
        '--name',
        'orders',
        '--description',
        'Another orders domain',
        '--system-type',
        'domain',
      ]);

      const output = testContext.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.DuplicateDomain);
    });
  });

  describe('error handling', () => {
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

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-domain',
        '--name',
        'orders',
        '--description',
        'Order management',
        '--system-type',
        'domain',
      ]);

      const output = testContext.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.GraphNotFound);
    });

    it('returns VALIDATION_ERROR when system type is invalid', async () => {
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-domain',
        '--name',
        'orders',
        '--description',
        'Order management',
        '--system-type',
        'invalid-type',
      ]);

      expect(testContext.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(testContext.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
          message: 'Invalid system type: invalid-type',
        },
      });
    });

    it('uses custom graph path when --graph provided', async () => {
      const customGraphPath = join(testContext.testDir, 'custom', 'graph.json');
      await mkdir(join(testContext.testDir, 'custom'), { recursive: true });
      const graph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: { orders: { description: 'Orders', systemType: 'domain' } },
        },
        components: [],
        links: [],
      };
      await writeFile(customGraphPath, JSON.stringify(graph), 'utf-8');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-domain',
        '--name',
        'payments',
        '--description',
        'Payment processing',
        '--system-type',
        'bff',
        '--graph',
        customGraphPath,
      ]);

      const content = await readFile(customGraphPath, 'utf-8');
      const savedGraph: unknown = JSON.parse(content);
      expect(savedGraph).toMatchObject({
        metadata: {
          domains: {
            orders: { description: 'Orders', systemType: 'domain' },
            payments: { description: 'Payment processing', systemType: 'bff' },
          },
        },
      });
    });
  });

  describe('unexpected builder errors', () => {
    const testContext: {
      testDir: string;
      originalCwd: string;
    } = {
      testDir: '',
      originalCwd: '',
    };

    beforeEach(async () => {
      testContext.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'));
      testContext.originalCwd = process.cwd();
      process.chdir(testContext.testDir);
      vi.resetModules();
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      process.chdir(testContext.originalCwd);
      await rm(testContext.testDir, { recursive: true });
    });

    it('rethrows unexpected errors from builder', async () => {
      const graphDir = join(testContext.testDir, '.riviere');
      await mkdir(graphDir, { recursive: true });
      const graph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: { orders: { description: 'Existing domain', systemType: 'domain' } },
        },
        components: [],
        links: [],
      };
      await writeFile(join(graphDir, 'graph.json'), JSON.stringify(graph), 'utf-8');

      const unexpectedError = new Error('Unexpected database error');

      vi.doMock('@living-architecture/riviere-builder', () => ({
        RiviereBuilder: {
          resume: vi.fn().mockReturnValue({
            addDomain: vi.fn().mockImplementation(() => {
              throw unexpectedError;
            }),
          }),
        },
        DuplicateDomainError: class DuplicateDomainError extends Error {},
      }));

      const { createProgram } = await import('../../cli');
      const program = createProgram();

      await expect(
        program.parseAsync([
          'node',
          'riviere',
          'builder',
          'add-domain',
          '--name',
          'payments',
          '--description',
          'Payment processing',
          '--system-type',
          'domain',
        ])
      ).rejects.toThrow('Unexpected database error');
    });
  });
});
