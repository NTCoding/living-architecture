import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';

describe('riviere builder init', () => {
  describe('command registration', () => {
    it('registers init command under builder', () => {
      const program = createProgram();
      const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder');
      const initCmd = builderCmd?.commands.find((cmd) => cmd.name() === 'init');

      expect(initCmd?.name()).toBe('init');
    });
  });

  describe('graph file creation', () => {
    const testContext = {
      testDir: '',
      originalCwd: '',
    };

    beforeEach(async () => {
      testContext.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'));
      testContext.originalCwd = process.cwd();
      process.chdir(testContext.testDir);
    });

    afterEach(async () => {
      process.chdir(testContext.originalCwd);
      await rm(testContext.testDir, { recursive: true });
    });

    it('creates .riviere/graph.json when called with valid source and domain', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--source',
        'https://github.com/org/repo',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
      ]);

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const fileStat = await stat(graphPath);
      expect(fileStat.isFile()).toBe(true);

      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({ version: '1.0' });
    });

    it('includes source repository in graph metadata', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--source',
        'https://github.com/org/repo',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
      ]);

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
        },
      });
    });

    it('includes multiple sources when multiple --source flags provided', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--source',
        'https://github.com/org/repo1',
        '--source',
        'https://github.com/org/repo2',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
      ]);

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo1' }, { repository: 'https://github.com/org/repo2' }],
        },
      });
    });

    it('includes domain with correct metadata', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--source',
        'https://github.com/org/repo',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
      ]);

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        metadata: {
          domains: {
            orders: {
              description: 'Order management',
              systemType: 'domain',
            },
          },
        },
      });
    });

    it('includes multiple domains when multiple --domain flags provided', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--source',
        'https://github.com/org/repo',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
        '--domain',
        '{"name":"payments","description":"Payment processing","systemType":"bff"}',
      ]);

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        metadata: {
          domains: {
            orders: { description: 'Order management', systemType: 'domain' },
            payments: { description: 'Payment processing', systemType: 'bff' },
          },
        },
      });
    });

    it('includes name in graph metadata when --name provided', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--name',
        'ecommerce',
        '--source',
        'https://github.com/org/repo',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
      ]);

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        metadata: {
          name: 'ecommerce',
        },
      });
    });

    it('omits name from graph metadata when --name not provided', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--source',
        'https://github.com/org/repo',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
      ]);

      const graphPath = join(testContext.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        metadata: {},
      });
      expect(graph).not.toHaveProperty('metadata.name');
    });
  });

  describe('graph already exists', () => {
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

    it('returns GRAPH_EXISTS error when .riviere/graph.json already exists', async () => {
      const graphDir = join(testContext.testDir, '.riviere');
      await mkdir(graphDir, { recursive: true });
      await writeFile(join(graphDir, 'graph.json'), '{"existing": true}', 'utf-8');

      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--source',
        'https://github.com/org/repo',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
      ]);

      const output = testContext.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.GraphExists);
    });

    it('does not modify existing graph.json when it already exists', async () => {
      const graphDir = join(testContext.testDir, '.riviere');
      const originalContent = '{"existing": true}';
      await mkdir(graphDir, { recursive: true });
      await writeFile(join(graphDir, 'graph.json'), originalContent, 'utf-8');

      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--source',
        'https://github.com/org/repo',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
      ]);

      const content = await readFile(join(graphDir, 'graph.json'), 'utf-8');
      expect(content).toBe(originalContent);
    });
  });

  describe('validation errors', () => {
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
    });

    afterEach(async () => {
      process.chdir(testContext.originalCwd);
      await rm(testContext.testDir, { recursive: true });
    });

    it('throws when domain JSON is not valid JSON', async () => {
      const program = createProgram();

      await expect(
        program.parseAsync([
          'node',
          'riviere',
          'builder',
          'init',
          '--source',
          'https://github.com/org/repo',
          '--domain',
          'not valid json',
        ])
      ).rejects.toThrow();
    });

    it('throws when domain JSON is not an object', async () => {
      const program = createProgram();

      await expect(
        program.parseAsync([
          'node',
          'riviere',
          'builder',
          'init',
          '--source',
          'https://github.com/org/repo',
          '--domain',
          '"just a string"',
        ])
      ).rejects.toThrow('Invalid domain JSON');
    });

    it('throws when domain JSON is missing required fields', async () => {
      const program = createProgram();

      await expect(
        program.parseAsync([
          'node',
          'riviere',
          'builder',
          'init',
          '--source',
          'https://github.com/org/repo',
          '--domain',
          '{"name":"orders"}',
        ])
      ).rejects.toThrow('Invalid domain JSON');
    });

  });
});
