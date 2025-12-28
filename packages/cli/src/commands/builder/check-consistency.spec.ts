import { describe, it, expect } from 'vitest';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import type { TestContext } from '../../command-test-fixtures';
import {
  createTestContext,
  setupCommandTest,
  createGraph,
  baseMetadata,
  sourceLocation,
  parseErrorOutput,
  parseSuccessOutput,
  hasSuccessOutputStructure,
  testCommandRegistration,
  testCustomGraphPath,
} from '../../command-test-fixtures';

interface ConsistencyWarning {
  code: string;
  message: string;
  componentId?: string;
  domainName?: string;
}

interface ConsistencyOutput {
  success: true;
  data: {
    consistent: boolean;
    warnings: ConsistencyWarning[];
  };
  warnings: string[];
}

function isConsistencyOutput(value: unknown): value is ConsistencyOutput {
  if (!hasSuccessOutputStructure(value)) return false;
  if (!('consistent' in value.data) || typeof value.data.consistent !== 'boolean') return false;
  if (!('warnings' in value.data) || !Array.isArray(value.data.warnings)) return false;
  return true;
}

function parseConsistencyOutput(consoleOutput: string[]): ConsistencyOutput {
  return parseSuccessOutput(consoleOutput, isConsistencyOutput, 'Invalid check-consistency output');
}

describe('riviere builder check-consistency', () => {
  describe('command registration', () => {
    testCommandRegistration('check-consistency');
  });

  describe('error handling', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync(['node', 'riviere', 'builder', 'check-consistency', '--json']);
      const output = parseErrorOutput(ctx.consoleOutput);
      expect(output.error.code).toBe(CliErrorCode.GraphNotFound);
    });

    it('uses custom graph path when --graph provided', async () => {
      const output = await testCustomGraphPath(ctx, ['builder', 'check-consistency'], parseConsistencyOutput);
      expect(output.success).toBe(true);
    });
  });

  describe('consistency output (--json)', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns consistent=true with empty warnings when graph has no problems', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [
          {
            id: 'orders:checkout:api:place-order',
            name: 'place-order',
            type: 'API',
            domain: 'orders',
            module: 'checkout',
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
            sourceLocation,
          },
          {
            id: 'orders:checkout:usecase:place-order',
            name: 'place-order',
            type: 'UseCase',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
          },
        ],
        links: [
          {
            id: 'orders:checkout:api:place-order→orders:checkout:usecase:place-order:sync',
            source: 'orders:checkout:api:place-order',
            target: 'orders:checkout:usecase:place-order',
            type: 'sync',
          },
        ],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'check-consistency', '--json']);
      const output = parseConsistencyOutput(ctx.consoleOutput);

      expect(output.data.consistent).toBe(true);
      expect(output.data.warnings).toHaveLength(0);
    });

    it('returns orphan warnings when components have no links', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [
          {
            id: 'orders:checkout:usecase:orphan',
            name: 'orphan',
            type: 'UseCase',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
          },
        ],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'check-consistency', '--json']);
      const output = parseConsistencyOutput(ctx.consoleOutput);

      expect(output.data.consistent).toBe(false);
      expect(output.data.warnings.length).toBeGreaterThan(0);
      const orphanWarning = output.data.warnings.find((w) => w.code === 'ORPHAN_COMPONENT');
      expect(orphanWarning?.componentId).toBe('orders:checkout:usecase:orphan');
    });

    it('returns unused domain warnings when domain has no components', async () => {
      const metadataWithUnused = {
        ...baseMetadata,
        domains: {
          ...baseMetadata.domains,
          payments: { description: 'Unused domain', systemType: 'domain' as const },
        },
      };

      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: metadataWithUnused,
        components: [
          {
            id: 'orders:checkout:api:place-order',
            name: 'place-order',
            type: 'API',
            domain: 'orders',
            module: 'checkout',
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
            sourceLocation,
          },
          {
            id: 'orders:checkout:usecase:place-order',
            name: 'place-order',
            type: 'UseCase',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
          },
        ],
        links: [
          {
            id: 'orders:checkout:api:place-order→orders:checkout:usecase:place-order:sync',
            source: 'orders:checkout:api:place-order',
            target: 'orders:checkout:usecase:place-order',
            type: 'sync',
          },
        ],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'check-consistency', '--json']);
      const output = parseConsistencyOutput(ctx.consoleOutput);

      expect(output.data.consistent).toBe(false);
      const unusedWarning = output.data.warnings.find((w) => w.code === 'UNUSED_DOMAIN');
      expect(unusedWarning?.domainName).toBe('payments');
    });

    it('returns consistent=false when issues exist', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [
          {
            id: 'orders:checkout:usecase:orphan',
            name: 'orphan',
            type: 'UseCase',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
          },
        ],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'check-consistency', '--json']);
      const output = parseConsistencyOutput(ctx.consoleOutput);

      expect(output.data.consistent).toBe(false);
    });
  });

  describe('human output (no --json)', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('produces no output when --json flag not provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'check-consistency']);
      expect(ctx.consoleOutput).toHaveLength(0);
    });
  });
});
