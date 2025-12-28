import { describe, it, expect, vi } from 'vitest';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import type { TestContext } from '../../command-test-fixtures';
import { createTestContext, setupCommandTest, createGraph, sourceLocation } from '../../command-test-fixtures';

interface ComponentInfo {
  id: string;
  type: string;
  name: string;
  domain: string;
}

interface ComponentsOutput {
  success: true;
  data: {
    components: ComponentInfo[];
  };
  warnings: string[];
}

function isComponentsOutput(value: unknown): value is ComponentsOutput {
  if (typeof value !== 'object' || value === null) return false;
  if (!('success' in value) || value.success !== true) return false;
  if (!('data' in value) || typeof value.data !== 'object' || value.data === null) return false;
  if (!('components' in value.data) || !Array.isArray(value.data.components)) return false;
  return true;
}

function parseOutput(consoleOutput: string[]): ComponentsOutput {
  const parsed: unknown = JSON.parse(consoleOutput[0] ?? '{}');
  if (!isComponentsOutput(parsed)) {
    throw new Error(`Invalid components output: ${consoleOutput[0]}`);
  }
  return parsed;
}

describe('riviere query components', () => {
  describe('command registration', () => {
    it('registers components command under query', () => {
      const program = createProgram();
      const queryCmd = program.commands.find((cmd) => cmd.name() === 'query');
      const componentsCmd = queryCmd?.commands.find((cmd) => cmd.name() === 'components');
      expect(componentsCmd?.name()).toBe('components');
    });
  });

  describe('querying components', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns all components with id, type, name, domain fields', async () => {
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
        ],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'query', 'components', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.success).toBe(true);
      expect(output.data.components).toHaveLength(2);
      expect(output.data.components[0]).toEqual({
        id: 'orders:checkout:api:place-order',
        type: 'API',
        name: 'place-order',
        domain: 'orders',
      });
    });

    it('returns only components in specified domain when --domain provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
            orders: { description: 'Order management', systemType: 'domain' },
            payments: { description: 'Payment processing', systemType: 'domain' },
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

      await createProgram().parseAsync(['node', 'riviere', 'query', 'components', '--domain', 'orders', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.components).toHaveLength(1);
      expect(output.data.components[0]?.domain).toBe('orders');
    });

    it('returns only components of specified type when --type provided', async () => {
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
        ],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'query', 'components', '--type', 'API', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.components).toHaveLength(1);
      expect(output.data.components[0]?.type).toBe('API');
    });

    it('accepts case-insensitive type values', async () => {
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
        ],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'query', 'components', '--type', 'api', '--json']);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.components).toHaveLength(1);
    });

    it('returns only components matching both filters when --domain and --type provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
            orders: { description: 'Order management', systemType: 'domain' },
            payments: { description: 'Payment processing', systemType: 'domain' },
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
            id: 'orders:checkout:usecase:place-order',
            type: 'UseCase',
            name: 'place-order',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
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

      await createProgram().parseAsync([
        'node',
        'riviere',
        'query',
        'components',
        '--domain',
        'orders',
        '--type',
        'API',
        '--json',
      ]);
      const output = parseOutput(ctx.consoleOutput);
      expect(output.data.components).toHaveLength(1);
      expect(output.data.components[0]?.id).toBe('orders:checkout:api:place-order');
    });

    it('produces no output when --json flag is not provided', async () => {
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
        ],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'query', 'components']);
      expect(ctx.consoleOutput).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync(['node', 'riviere', 'query', 'components', '--json']);
      expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.GraphNotFound);
    });

    it('returns VALIDATION_ERROR when --type value is invalid', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: { orders: { description: 'Order management', systemType: 'domain' } },
        },
        components: [],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'query', 'components', '--type', 'InvalidType', '--json']);
      expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.ValidationError);
    });

    it('outputs error to stderr when --type is invalid and --json not provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: { orders: { description: 'Order management', systemType: 'domain' } },
        },
        components: [],
        links: [],
      });

      const errorOutput: string[] = [];
      const errorSpy = vi.spyOn(console, 'error').mockImplementation((msg: string) => errorOutput.push(msg));

      await createProgram().parseAsync(['node', 'riviere', 'query', 'components', '--type', 'InvalidType']);

      expect(errorOutput).toHaveLength(1);
      expect(errorOutput[0]).toContain('Invalid component type: InvalidType');
      errorSpy.mockRestore();
    });
  });
});
