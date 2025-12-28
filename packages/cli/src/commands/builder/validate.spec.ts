import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';

interface TestContext {
  testDir: string;
  originalCwd: string;
  consoleOutput: string[];
}

interface ValidationOutput {
  success: true;
  data: {
    valid: boolean;
    errors: Array<{ code: string; message: string; path: string }>;
    warnings: Array<{ code: string; message: string; componentId?: string; domainName?: string }>;
  };
}

function isValidationOutput(value: unknown): value is ValidationOutput {
  if (typeof value !== 'object' || value === null) return false;
  if (!('success' in value) || value.success !== true) return false;
  if (!('data' in value) || typeof value.data !== 'object' || value.data === null) return false;
  if (!('valid' in value.data) || typeof value.data.valid !== 'boolean') return false;
  if (!('errors' in value.data) || !Array.isArray(value.data.errors)) return false;
  return true;
}

function parseOutput(consoleOutput: string[]): ValidationOutput {
  const parsed: unknown = JSON.parse(consoleOutput[0] ?? '{}');
  if (!isValidationOutput(parsed)) {
    throw new Error('Invalid validation output');
  }
  return parsed;
}

async function createGraph(testDir: string, graphData: object, subPath = '.riviere'): Promise<string> {
  const graphDir = join(testDir, subPath);
  await mkdir(graphDir, { recursive: true });
  const graphPath = join(graphDir, 'graph.json');
  await writeFile(graphPath, JSON.stringify(graphData), 'utf-8');
  return graphPath;
}

const baseMetadata = {
  sources: [{ repository: 'https://github.com/org/repo' }],
  domains: { orders: { description: 'Order management', systemType: 'domain' } },
};

const sourceLocation = { repository: 'https://github.com/org/repo', filePath: 'src/orders/place-order.ts' };

const validComponent = {
  id: 'orders:checkout:usecase:place-order',
  type: 'UseCase',
  name: 'place-order',
  domain: 'orders',
  module: 'checkout',
  sourceLocation,
};

const apiComponent = {
  id: 'orders:checkout:api:place-order',
  type: 'API',
  name: 'place-order',
  domain: 'orders',
  module: 'checkout',
  sourceLocation,
  apiType: 'REST',
  httpMethod: 'POST',
  path: '/orders',
};

const validLink = {
  id: 'orders:checkout:api:place-order→orders:checkout:usecase:place-order:sync',
  source: 'orders:checkout:api:place-order',
  target: 'orders:checkout:usecase:place-order',
  type: 'sync',
};

describe('riviere builder validate', () => {
  describe('command registration', () => {
    it('registers validate command under builder', () => {
      const program = createProgram();
      const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder');
      const validateCmd = builderCmd?.commands.find((cmd) => cmd.name() === 'validate');
      expect(validateCmd?.name()).toBe('validate');
    });
  });

  describe('validating a graph', () => {
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

    it('returns valid=true with empty errors when graph is valid', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [validComponent, apiComponent],
        links: [validLink],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.valid).toBe(true);
      expect(output.data.errors).toHaveLength(0);
    });

    it('produces no output when --json flag is not provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [validComponent, apiComponent],
        links: [validLink],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate']);
      expect(ctx.consoleOutput).toHaveLength(0);
    });

    it('returns valid=false with errors when graph has dangling link target', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent],
        links: [{ ...validLink, target: 'orders:checkout:usecase:nonexistent' }],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.valid).toBe(false);
      expect(output.data.errors.some((e) => e.code === 'INVALID_LINK_TARGET')).toBe(true);
    });

    it('returns valid=false with errors when graph has dangling link source', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [validComponent],
        links: [{ ...validLink, source: 'orders:checkout:api:nonexistent' }],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.valid).toBe(false);
      expect(output.data.errors.some((e) => e.code === 'INVALID_LINK_SOURCE')).toBe(true);
    });

    it('returns valid=false with multiple errors for multiple issues', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [{ id: 'x→y:sync', source: 'nonexistent:source', target: 'nonexistent:target', type: 'sync' }],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.valid).toBe(false);
      expect(output.data.errors.length).toBeGreaterThan(1);
    });

    it('includes warnings for orphan components in response', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [{ ...validComponent, id: 'orders:checkout:usecase:orphan', name: 'orphan', sourceLocation }],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.valid).toBe(true);
      const orphanWarning = output.data.warnings.find((w) => w.code === 'ORPHAN_COMPONENT');
      expect(orphanWarning?.componentId).toBe('orders:checkout:usecase:orphan');
    });

    it('includes warnings for unused domains in response', async () => {
      const metadataWithUnused = {
        ...baseMetadata,
        domains: {
          ...baseMetadata.domains,
          payments: { description: 'Unused', systemType: 'domain' },
        },
      };

      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: metadataWithUnused,
        components: [validComponent, apiComponent],
        links: [validLink],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      const unusedWarning = output.data.warnings.find((w) => w.code === 'UNUSED_DOMAIN');
      expect(unusedWarning?.domainName).toBe('payments');
    });
  });

  describe('JSON output (--json flag)', () => {
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

    it('outputs success JSON with valid=true when graph is valid', async () => {
      await createGraph(ctx.testDir, { version: '1.0', metadata: baseMetadata, components: [], links: [] });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.success).toBe(true);
      expect(output.data.valid).toBe(true);
      expect(output.data.errors).toHaveLength(0);
    });

    it('outputs success JSON with valid=false and errors when graph is invalid', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [{ id: 'x→y:sync', source: 'x', target: 'y', type: 'sync' }],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.success).toBe(true);
      expect(output.data.valid).toBe(false);
      expect(output.data.errors.length).toBeGreaterThan(0);
    });

    it('includes warnings array in success response', async () => {
      await createGraph(ctx.testDir, { version: '1.0', metadata: baseMetadata, components: [], links: [] });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(Array.isArray(output.data.warnings)).toBe(true);
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
      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate']);
      expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.GraphNotFound);
    });

    it('uses custom graph path when --graph provided', async () => {
      const customPath = await createGraph(
        ctx.testDir,
        { version: '1.0', metadata: baseMetadata, components: [], links: [] },
        'custom'
      );

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'validate', '--graph', customPath, '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.valid).toBe(true);
    });
  });
});
