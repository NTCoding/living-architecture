import {
 describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest';
import {
 readFile, mkdir, writeFile, mkdtemp, rm 
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
  createGraphWithDomain,
} from '../../command-test-fixtures';

describe('riviere builder add-domain', () => {
  describe('command registration', () => {
    it('registers add-domain command under builder', () => {
      const program = createProgram();
      const builderCmd = program.commands.find(
        (cmd) => cmd.name() === 'builder',
      );
      const addDomainCmd = builderCmd?.commands.find(
        (cmd) => cmd.name() === 'add-domain',
      );

      expect(addDomainCmd?.name()).toBe('add-domain');
    });
  });

  describe('adding domain to existing graph', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('adds domain to graph metadata when graph exists', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

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

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        metadata: {
          domains: {
            orders: {
 description: 'Test domain',
systemType: 'domain' 
},
            payments: {
 description: 'Payment processing',
systemType: 'bff' 
},
          },
        },
      });
    });

    it('outputs success JSON when --json flag provided', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

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

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
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
      await createGraphWithDomain(ctx.testDir, 'orders');

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

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.DuplicateDomain);
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
        'add-domain',
        '--name',
        'orders',
        '--description',
        'Order management',
        '--system-type',
        'domain',
      ]);

      const output = ctx.consoleOutput.join('\n');
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

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
          message: 'Invalid system type: invalid-type',
        },
      });
    });

    it('uses custom graph path when --graph provided', async () => {
      const customGraphPath = join(ctx.testDir, 'custom', 'graph.json');
      await mkdir(join(ctx.testDir, 'custom'), { recursive: true });
      const graph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
 orders: {
 description: 'Orders',
systemType: 'domain' 
} 
},
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
            orders: {
 description: 'Orders',
systemType: 'domain' 
},
            payments: {
 description: 'Payment processing',
systemType: 'bff' 
},
          },
        },
      });
    });
  });

  describe('unexpected builder errors', () => {
    const mockContext: {
 testDir: string;
originalCwd: string 
} = {
      testDir: '',
      originalCwd: '',
    };

    beforeEach(async () => {
      mockContext.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'));
      mockContext.originalCwd = process.cwd();
      process.chdir(mockContext.testDir);
      vi.resetModules();
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      process.chdir(mockContext.originalCwd);
      await rm(mockContext.testDir, { recursive: true });
    });

    it('rethrows unexpected errors from builder', async () => {
      await createGraphWithDomain(mockContext.testDir, 'orders');

      const unexpectedError = new Error('Unexpected database error');
      const throwUnexpectedError = () => {
        throw unexpectedError;
      };

      vi.doMock('@living-architecture/riviere-builder', () => ({
        RiviereBuilder: {resume: vi.fn().mockReturnValue({addDomain: vi.fn().mockImplementation(throwUnexpectedError),}),},
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
        ]),
      ).rejects.toThrow('Unexpected database error');
    });
  });
});
