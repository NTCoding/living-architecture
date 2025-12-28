import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';

interface TestContext {
  testDir: string;
  originalCwd: string;
  consoleOutput: string[];
}

interface FinalizeSuccessOutput {
  success: true;
  data: { path: string };
  warnings: string[];
}

interface FinalizeErrorOutput {
  success: false;
  error: { code: string; message: string; suggestions: string[] };
}

function isFinalizeSuccess(value: unknown): value is FinalizeSuccessOutput {
  if (typeof value !== 'object' || value === null) return false;
  if (!('success' in value) || value.success !== true) return false;
  if (!('data' in value) || typeof value.data !== 'object' || value.data === null) return false;
  if (!('path' in value.data) || typeof value.data.path !== 'string') return false;
  return true;
}

function isFinalizeError(value: unknown): value is FinalizeErrorOutput {
  if (typeof value !== 'object' || value === null) return false;
  if (!('success' in value) || value.success !== false) return false;
  if (!('error' in value) || typeof value.error !== 'object' || value.error === null) return false;
  if (!('code' in value.error) || typeof value.error.code !== 'string') return false;
  return true;
}

async function createGraph(testDir: string, graphData: object, subPath = '.riviere'): Promise<string> {
  const graphDir = join(testDir, subPath);
  await mkdir(graphDir, { recursive: true });
  const graphPath = join(graphDir, 'graph.json');
  await writeFile(graphPath, JSON.stringify(graphData), 'utf-8');
  return graphPath;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const baseMetadata = {
  sources: [{ repository: 'https://github.com/org/repo' }],
  domains: { orders: { description: 'Order management', systemType: 'domain' } },
};

const sourceLocation = { repository: 'https://github.com/org/repo', filePath: 'src/orders/component.ts' };

const validComponent = {
  id: 'orders:checkout:usecase:place-order',
  type: 'UseCase',
  name: 'place-order',
  domain: 'orders',
  module: 'checkout',
  sourceLocation,
};

describe('riviere builder finalize', () => {
  describe('command registration', () => {
    it('registers finalize command under builder', () => {
      const program = createProgram();
      const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder');
      const finalizeCmd = builderCmd?.commands.find((cmd) => cmd.name() === 'finalize');
      expect(finalizeCmd?.name()).toBe('finalize');
    });
  });

  describe('finalizing a valid graph', () => {
    const ctx: TestContext = { testDir: '', originalCwd: '', consoleOutput: [] };

    beforeEach(async () => {
      ctx.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'));
      ctx.originalCwd = process.cwd();
      ctx.consoleOutput = [];
      process.chdir(ctx.testDir);
      vi.spyOn(console, 'log').mockImplementation((msg: string) => ctx.consoleOutput.push(msg));
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      process.chdir(ctx.originalCwd);
      await rm(ctx.testDir, { recursive: true });
    });

    it('writes graph to .riviere/graph.json when graph is valid', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [validComponent],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'finalize']);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const exists = await fileExists(graphPath);
      expect(exists).toBe(true);

      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({ version: '1.0', metadata: baseMetadata });
    });

    it('writes graph to custom path when --output provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [validComponent],
        links: [],
      });

      const customOutput = join(ctx.testDir, 'dist', 'architecture.json');
      await mkdir(join(ctx.testDir, 'dist'), { recursive: true });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'finalize', '--output', customOutput]);

      const exists = await fileExists(customOutput);
      expect(exists).toBe(true);
    });

    it('outputs success JSON with path when --json flag provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [validComponent],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'finalize', '--json']);

      expect(ctx.consoleOutput).toHaveLength(1);
      const parsed: unknown = JSON.parse(ctx.consoleOutput[0] ?? '{}');
      if (!isFinalizeSuccess(parsed)) {
        throw new Error('Expected success output');
      }
      expect(parsed.success).toBe(true);
      expect(parsed.data.path).toContain('.riviere/graph.json');
    });
  });

  describe('finalizing an invalid graph', () => {
    const ctx: TestContext = { testDir: '', originalCwd: '', consoleOutput: [] };

    beforeEach(async () => {
      ctx.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'));
      ctx.originalCwd = process.cwd();
      ctx.consoleOutput = [];
      process.chdir(ctx.testDir);
      vi.spyOn(console, 'log').mockImplementation((msg: string) => ctx.consoleOutput.push(msg));
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      process.chdir(ctx.originalCwd);
      await rm(ctx.testDir, { recursive: true });
    });

    it('returns VALIDATION_ERROR when graph has errors', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [{ id: 'x→y:sync', source: 'nonexistent:source', target: 'nonexistent:target', type: 'sync' }],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'finalize']);

      expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.ValidationError);
    });

    it('does NOT write file when graph is invalid', async () => {
      const graphPath = await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [{ id: 'x→y:sync', source: 'nonexistent:source', target: 'nonexistent:target', type: 'sync' }],
      });

      const originalContent = await readFile(graphPath, 'utf-8');

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'finalize']);

      const currentContent = await readFile(graphPath, 'utf-8');
      expect(currentContent).toBe(originalContent);
    });

    it('includes validation errors in error response', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [{ id: 'x→y:sync', source: 'nonexistent:source', target: 'nonexistent:target', type: 'sync' }],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'finalize']);

      const parsed: unknown = JSON.parse(ctx.consoleOutput[0] ?? '{}');
      if (!isFinalizeError(parsed)) {
        throw new Error('Expected error output');
      }
      expect(parsed.error.code).toBe(CliErrorCode.ValidationError);
      expect(parsed.error.message).toContain('Validation failed');
    });
  });

  describe('error handling', () => {
    const ctx: TestContext = { testDir: '', originalCwd: '', consoleOutput: [] };

    beforeEach(async () => {
      ctx.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'));
      ctx.originalCwd = process.cwd();
      ctx.consoleOutput = [];
      process.chdir(ctx.testDir);
      vi.spyOn(console, 'log').mockImplementation((msg: string) => ctx.consoleOutput.push(msg));
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      process.chdir(ctx.originalCwd);
      await rm(ctx.testDir, { recursive: true });
    });

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync(['node', 'riviere', 'builder', 'finalize']);
      expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.GraphNotFound);
    });

    it('uses custom graph path when --graph provided for reading', async () => {
      const customPath = await createGraph(
        ctx.testDir,
        { version: '1.0', metadata: baseMetadata, components: [validComponent], links: [] },
        'custom'
      );

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'finalize', '--graph', customPath, '--json']);

      const parsed: unknown = JSON.parse(ctx.consoleOutput[0] ?? '{}');
      if (!isFinalizeSuccess(parsed)) {
        throw new Error('Expected success output');
      }
      expect(parsed.success).toBe(true);
    });
  });
});
