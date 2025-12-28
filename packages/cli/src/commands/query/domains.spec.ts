import { describe, it, expect } from 'vitest';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import type { TestContext } from '../../command-test-fixtures';
import { createTestContext, setupCommandTest, createGraph, sourceLocation } from '../../command-test-fixtures';

interface ComponentCounts {
  UI: number;
  API: number;
  UseCase: number;
  DomainOp: number;
  Event: number;
  EventHandler: number;
  Custom: number;
  total: number;
}

interface DomainInfo {
  name: string;
  description: string;
  systemType: string;
  componentCounts: ComponentCounts;
}

interface DomainsOutput {
  success: true;
  data: {
    domains: DomainInfo[];
  };
  warnings: string[];
}

function isDomainsOutput(value: unknown): value is DomainsOutput {
  if (typeof value !== 'object' || value === null) return false;
  if (!('success' in value) || value.success !== true) return false;
  if (!('data' in value) || typeof value.data !== 'object' || value.data === null) return false;
  if (!('domains' in value.data) || !Array.isArray(value.data.domains)) return false;
  return true;
}

function parseOutput(consoleOutput: string[]): DomainsOutput {
  const parsed: unknown = JSON.parse(consoleOutput[0] ?? '{}');
  if (!isDomainsOutput(parsed)) {
    throw new Error(`Invalid domains output: ${consoleOutput[0]}`);
  }
  return parsed;
}

describe('riviere query domains', () => {
  describe('command registration', () => {
    it('registers domains command under query', () => {
      const program = createProgram();
      const queryCmd = program.commands.find((cmd) => cmd.name() === 'query');
      const domainsCmd = queryCmd?.commands.find((cmd) => cmd.name() === 'domains');
      expect(domainsCmd?.name()).toBe('domains');
    });
  });

  describe('querying domains', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns domain names with component counts', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: { orders: { description: 'Order management', systemType: 'domain' } },
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
            id: 'orders:checkout:usecase:place-order',
            type: 'UseCase',
            name: 'place-order',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
          },
          {
            id: 'orders:checkout:usecase:cancel-order',
            type: 'UseCase',
            name: 'cancel-order',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
          },
        ],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'query', 'domains', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.success).toBe(true);
      expect(output.data.domains).toHaveLength(1);
      expect(output.data.domains[0]?.name).toBe('orders');
      expect(output.data.domains[0]?.componentCounts.API).toBe(1);
      expect(output.data.domains[0]?.componentCounts.UseCase).toBe(2);
      expect(output.data.domains[0]?.componentCounts.total).toBe(3);
    });

    it('returns all domains from graph metadata', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
            orders: { description: 'Order management', systemType: 'domain' },
            payments: { description: 'Payment processing', systemType: 'bff' },
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
            id: 'payments:billing:api:process-payment',
            type: 'API',
            name: 'process-payment',
            domain: 'payments',
            module: 'billing',
            sourceLocation,
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/payments',
          },
        ],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'query', 'domains', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.domains).toHaveLength(2);
      expect(output.data.domains.map((d) => d.name).sort()).toEqual(['orders', 'payments']);
    });

    it('produces no output when --json flag is not provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: { orders: { description: 'Order management', systemType: 'domain' } },
        },
        components: [],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'query', 'domains']);
      expect(ctx.consoleOutput).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync(['node', 'riviere', 'query', 'domains', '--json']);
      expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.GraphNotFound);
    });
  });
});
