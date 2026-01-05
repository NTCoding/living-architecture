import {
  describe, it, expect, beforeEach, afterEach, vi 
} from 'vitest';
import {
  mkdtemp, rm, readFile, stat 
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';

describe('riviere builder init options', () => {
  describe('--graph custom path', () => {
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

    it('creates graph at custom path when --graph provided', async () => {
      const customPath = join(testContext.testDir, 'custom', 'path', 'graph.json');
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--graph',
        customPath,
        '--source',
        'https://github.com/org/repo',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
      ]);

      const fileStat = await stat(customPath);
      expect(fileStat.isFile()).toBe(true);

      const content = await readFile(customPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({ version: '1.0' });
    });

    it('does not create .riviere directory when --graph points elsewhere', async () => {
      const customPath = join(testContext.testDir, 'custom', 'graph.json');
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--graph',
        customPath,
        '--source',
        'https://github.com/org/repo',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
      ]);

      const riviereDir = join(testContext.testDir, '.riviere');
      await expect(stat(riviereDir)).rejects.toThrow();
    });
  });

  describe('--json output', () => {
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

    it('outputs success JSON with path and domains when --json provided', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--json',
        '--source',
        'https://github.com/org/repo',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
        '--domain',
        '{"name":"payments","description":"Payment processing","systemType":"bff"}',
      ]);

      const output = testContext.consoleOutput.join('\n');
      const parsed: unknown = JSON.parse(output);

      expect(parsed).toMatchObject({
        success: true,
        data: {
          sources: 1,
          domains: ['orders', 'payments'],
        },
      });

      expect(parsed).toHaveProperty('data.path');
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'data' in parsed &&
        typeof parsed.data === 'object' &&
        parsed.data !== null &&
        'path' in parsed.data &&
        typeof parsed.data.path === 'string'
      ) {
        expect(parsed.data.path).toContain('.riviere/graph.json');
      }
    });
  });

  describe('required flags validation', () => {
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

    it('returns VALIDATION_ERROR when no --source provided', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--domain',
        '{"name":"orders","description":"Order management","systemType":"domain"}',
      ]);

      const output = testContext.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.ValidationError);
      expect(output).toContain('source');
    });

    it('returns VALIDATION_ERROR when no --domain provided', async () => {
      const program = createProgram();

      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'init',
        '--source',
        'https://github.com/org/repo',
      ]);

      const output = testContext.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.ValidationError);
      expect(output).toContain('domain');
    });
  });
});
