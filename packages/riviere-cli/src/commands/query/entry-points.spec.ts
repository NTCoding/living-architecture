import {
 describe, it, expect 
} from 'vitest';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import type { TestContext } from '../../command-test-fixtures';
import {
  createTestContext,
  setupCommandTest,
  createGraph,
  baseMetadata,
  sourceLocation,
  apiComponent,
  useCaseComponent,
  eventHandlerComponent,
} from '../../command-test-fixtures';

interface EntryPointsOutput {
  success: true;
  data: {
    entryPoints: Array<{
      id: string;
      type: string;
      name: string;
      domain: string;
    }>;
  };
  warnings: string[];
}

function isEntryPointsOutput(value: unknown): value is EntryPointsOutput {
  if (typeof value !== 'object' || value === null) return false;
  if (!('success' in value) || value.success !== true) return false;
  if (
    !('data' in value) ||
    typeof value.data !== 'object' ||
    value.data === null
  )
    return false;
  if (!('entryPoints' in value.data) || !Array.isArray(value.data.entryPoints))
    return false;
  return true;
}

function parseOutput(consoleOutput: string[]): EntryPointsOutput {
  const parsed: unknown = JSON.parse(consoleOutput[0] ?? '{}');
  if (!isEntryPointsOutput(parsed)) {
    throw new Error(`Invalid entry-points output: ${consoleOutput[0]}`);
  }
  return parsed;
}

describe('riviere query entry-points', () => {
  describe('command registration', () => {
    it('registers entry-points command under query', () => {
      const program = createProgram();
      const queryCmd = program.commands.find((cmd) => cmd.name() === 'query');
      const entryPointsCmd = queryCmd?.commands.find(
        (cmd) => cmd.name() === 'entry-points',
      );
      expect(entryPointsCmd?.name()).toBe('entry-points');
    });
  });

  describe('querying entry points', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns API components with no incoming links', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent, useCaseComponent],
        links: [
          {
            id: 'orders:checkout:api:place-order→orders:checkout:usecase:place-order:sync',
            source: 'orders:checkout:api:place-order',
            target: 'orders:checkout:usecase:place-order',
            type: 'sync',
          },
        ],
      });

      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'entry-points',
        '--json',
      ]);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.success).toBe(true);
      expect(output.data.entryPoints).toHaveLength(1);
      expect(output.data.entryPoints[0]?.id).toBe(
        'orders:checkout:api:place-order',
      );
    });

    it('returns EventHandler components with no incoming links', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [eventHandlerComponent, useCaseComponent],
        links: [
          {
            id: 'orders:checkout:eventhandler:on-order-placed→orders:checkout:usecase:place-order:async',
            source: 'orders:checkout:eventhandler:on-order-placed',
            target: 'orders:checkout:usecase:place-order',
            type: 'async',
          },
        ],
      });

      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'entry-points',
        '--json',
      ]);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.success).toBe(true);
      expect(output.data.entryPoints).toHaveLength(1);
      expect(output.data.entryPoints[0]?.id).toBe(
        'orders:checkout:eventhandler:on-order-placed',
      );
    });

    it('excludes components that have incoming links', async () => {
      const secondApi = {
        id: 'orders:checkout:api:get-order',
        type: 'API',
        name: 'get-order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation,
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/orders/:id',
      };

      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent, secondApi],
        links: [
          {
            id: 'orders:checkout:api:place-order→orders:checkout:api:get-order:sync',
            source: 'orders:checkout:api:place-order',
            target: 'orders:checkout:api:get-order',
            type: 'sync',
          },
        ],
      });

      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'entry-points',
        '--json',
      ]);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.entryPoints).toHaveLength(1);
      expect(output.data.entryPoints[0]?.id).toBe(
        'orders:checkout:api:place-order',
      );
      expect(
        output.data.entryPoints.some(
          (ep) => ep.id === 'orders:checkout:api:get-order',
        ),
      ).toBe(false);
    });

    it('produces no output when --json flag is not provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [apiComponent],
        links: [],
      });

      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'entry-points',
      ]);
      expect(ctx.consoleOutput).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'entry-points',
        '--json',
      ]);
      expect(ctx.consoleOutput.join('\n')).toContain(
        CliErrorCode.GraphNotFound,
      );
    });
  });
});
