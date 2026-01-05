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
  sourceLocation,
} from '../../command-test-fixtures';

interface ComponentInfo {
  id: string;
  type: string;
  name: string;
  domain: string;
}

interface SearchOutput {
  success: true;
  data: { components: ComponentInfo[] };
  warnings: string[];
}

function isSearchOutput(value: unknown): value is SearchOutput {
  if (typeof value !== 'object' || value === null) return false;
  if (!('success' in value) || value.success !== true) return false;
  if (!('data' in value) || typeof value.data !== 'object' || value.data === null) return false;
  if (!('components' in value.data) || !Array.isArray(value.data.components)) return false;
  return true;
}

function parseOutput(consoleOutput: string[]): SearchOutput {
  const parsed: unknown = JSON.parse(consoleOutput[0] ?? '{}');
  if (!isSearchOutput(parsed)) {
    throw new Error(`Invalid search output: ${consoleOutput[0]}`);
  }
  return parsed;
}

describe('riviere query search', () => {
  describe('command registration', () => {
    it('registers search command under query', () => {
      const program = createProgram();
      const queryCmd = program.commands.find((cmd) => cmd.name() === 'query');
      const searchCmd = queryCmd?.commands.find((cmd) => cmd.name() === 'search');
      expect(searchCmd?.name()).toBe('search');
    });
  });

  describe('searching components', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns components with search term in name (case-insensitive)', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
            orders: {
              description: 'Order management',
              systemType: 'domain',
            },
          },
        },
        components: [
          {
            id: 'orders:checkout:api:place-order',
            type: 'API',
            name: 'place-order',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
          },
          {
            id: 'orders:checkout:usecase:cancel-order',
            type: 'UseCase',
            name: 'cancel-order',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
          },
          {
            id: 'orders:checkout:api:get-products',
            type: 'API',
            name: 'get-products',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
            apiType: 'REST',
            httpMethod: 'GET',
            path: '/products',
          },
        ],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'query', 'search', 'order', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.success).toBe(true);
      expect(output.data.components).toHaveLength(3);
      const allMatchSearchTerm = output.data.components.every(
        (c) =>
          c.name.toLowerCase().includes('order') ||
          c.domain.toLowerCase().includes('order') ||
          c.type.toLowerCase().includes('order'),
      );
      expect(allMatchSearchTerm).toBe(true);
    });

    it('returns empty array when no matches found', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
            orders: {
              description: 'Order management',
              systemType: 'domain',
            },
          },
        },
        components: [
          {
            id: 'orders:checkout:api:place-order',
            type: 'API',
            name: 'place-order',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
          },
        ],
        links: [],
      });

      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'search',
        'nonexistent',
        '--json',
      ]);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.components).toHaveLength(0);
    });

    it('returns empty array when search term is empty', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
            orders: {
              description: 'Order management',
              systemType: 'domain',
            },
          },
        },
        components: [
          {
            id: 'orders:checkout:api:place-order',
            type: 'API',
            name: 'place-order',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
          },
        ],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'query', 'search', '', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.components).toHaveLength(0);
    });

    it('produces no output when --json flag is not provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
            orders: {
              description: 'Order management',
              systemType: 'domain',
            },
          },
        },
        components: [
          {
            id: 'orders:checkout:api:place-order',
            type: 'API',
            name: 'place-order',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
          },
        ],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'query', 'search', 'order']);
      expect(ctx.consoleOutput).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync(['node', 'riviere', 'query', 'search', 'term', '--json']);
      expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.GraphNotFound);
    });
  });
});
