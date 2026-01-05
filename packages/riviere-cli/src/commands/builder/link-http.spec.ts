import {
 describe, it, expect 
} from 'vitest';
import {
 mkdir, writeFile, readFile 
} from 'node:fs/promises';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import type { TestContext } from '../../command-test-fixtures';
import {
  createTestContext,
  setupCommandTest,
} from '../../command-test-fixtures';

interface ApiComponentDef {
  id: string;
  name: string;
  path: string;
  httpMethod?: string;
}

describe('riviere builder link-http', () => {
  describe('command registration', () => {
    it('registers link-http command under builder', () => {
      const program = createProgram();
      const builderCmd = program.commands.find(
        (cmd) => cmd.name() === 'builder',
      );
      expect(
        builderCmd?.commands.find((cmd) => cmd.name() === 'link-http')?.name(),
      ).toBe('link-http');
    });
  });

  describe('creating links by HTTP path', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    async function createGraph(apis: ApiComponentDef[]): Promise<void> {
      const graphDir = join(ctx.testDir, '.riviere');
      await mkdir(graphDir, { recursive: true });
      const graph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
orders: {
 description: 'Order management',
systemType: 'domain' 
},
},
        },
        components: apis.map((api) => ({
          id: api.id,
          type: 'API',
          name: api.name,
          domain: 'orders',
          module: 'checkout',
          apiType: 'REST',
          ...(api.httpMethod && { httpMethod: api.httpMethod }),
          path: api.path,
          sourceLocation: {
            repository: 'https://github.com/org/repo',
            filePath: 'src/api/orders.ts',
          },
        })),
        links: [],
      };
      await writeFile(
        join(graphDir, 'graph.json'),
        JSON.stringify(graph),
        'utf-8',
      );
    }

    const singleApi: ApiComponentDef = {
      id: 'orders:checkout:api:create-order',
      name: 'Create Order',
      path: '/orders',
      httpMethod: 'POST',
    };
    const multipleApis: ApiComponentDef[] = [
      {
        id: 'orders:checkout:api:get-orders',
        name: 'Get Orders',
        path: '/orders',
        httpMethod: 'GET',
      },
      {
        id: 'orders:checkout:api:create-order',
        name: 'Create Order',
        path: '/orders',
        httpMethod: 'POST',
      },
    ];

    function buildArgs(overrides: {
      path?: string;
      toType?: string;
      linkType?: string;
      method?: string;
      json?: boolean;
    }): string[] {
      const args = [
        'node',
        'riviere',
        'builder',
        'link-http',
        '--path',
        overrides.path ?? '/orders',
        '--to-domain',
        'orders',
        '--to-module',
        'checkout',
        '--to-type',
        overrides.toType ?? 'UseCase',
        '--to-name',
        'place-order',
      ];
      if (overrides.linkType) args.push('--link-type', overrides.linkType);
      if (overrides.method) args.push('--method', overrides.method);
      if (overrides.json !== false) args.push('--json');
      return args;
    }

    async function readGraph(): Promise<unknown> {
      return JSON.parse(
        await readFile(join(ctx.testDir, '.riviere', 'graph.json'), 'utf-8'),
      );
    }

    it('finds API by path and creates link', async () => {
      await createGraph([singleApi]);
      await createProgram().parseAsync(buildArgs({}));
      expect(await readGraph()).toMatchObject({
        links: [
          {
            source: 'orders:checkout:api:create-order',
            target: 'orders:checkout:usecase:place-order',
          },
        ],
      });
    });

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync(buildArgs({ json: false }));
      expect(ctx.consoleOutput.join('\n')).toContain(
        CliErrorCode.GraphNotFound,
      );
    });

    it('returns error when no API matches path', async () => {
      await createGraph([singleApi]);
      await createProgram().parseAsync(buildArgs({ path: '/nonexistent' }));
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: { code: CliErrorCode.ComponentNotFound },
      });
    });

    it('returns error without suggestions when graph has no APIs', async () => {
      await createGraph([]);
      await createProgram().parseAsync(buildArgs({}));
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: { code: 'COMPONENT_NOT_FOUND' },
      });
      expect(ctx.consoleOutput[0]).not.toContain('Available paths');
    });

    it('returns error when multiple APIs match path without --method filter', async () => {
      await createGraph(multipleApis);
      await createProgram().parseAsync(buildArgs({}));
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: { code: 'AMBIGUOUS_API_MATCH' },
      });
    });

    it('filters by --method when multiple APIs match path', async () => {
      await createGraph(multipleApis);
      await createProgram().parseAsync(buildArgs({ method: 'POST' }));
      expect(await readGraph()).toMatchObject({
        links: [
          {
            source: 'orders:checkout:api:create-order',
            target: 'orders:checkout:usecase:place-order',
          },
        ],
      });
    });

    it('outputs success JSON with link and matched API details', async () => {
      await createGraph([singleApi]);
      await createProgram().parseAsync(buildArgs({}));
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: true,
        data: {
          link: {
            source: 'orders:checkout:api:create-order',
            target: 'orders:checkout:usecase:place-order',
          },
          matchedApi: {
            id: 'orders:checkout:api:create-order',
            path: '/orders',
          },
        },
      });
    });

    it('creates link without output when --json not provided', async () => {
      await createGraph([singleApi]);
      await createProgram().parseAsync(buildArgs({ json: false }));
      expect(ctx.consoleOutput).toHaveLength(0);
      expect(await readGraph()).toMatchObject({
        links: [
          {
            source: 'orders:checkout:api:create-order',
            target: 'orders:checkout:usecase:place-order',
          },
        ],
      });
    });

    it('sets link type when --link-type async provided', async () => {
      await createGraph([singleApi]);
      await createProgram().parseAsync(buildArgs({ linkType: 'async' }));
      expect(await readGraph()).toMatchObject({
        links: [
          {
            source: 'orders:checkout:api:create-order',
            target: 'orders:checkout:usecase:place-order',
            type: 'async',
          },
        ],
      });
    });

    it.each([
      {
        override: { toType: 'InvalidType' },
        message: 'Invalid component type: InvalidType',
      },
      {
        override: { linkType: 'invalid' },
        message: 'Invalid link type: invalid',
      },
      {
        override: { method: 'INVALID' },
        message: 'Invalid HTTP method: INVALID',
      },
    ])(
      'returns VALIDATION_ERROR for invalid input: $message',
      async ({
 override, message 
}) => {
        await createGraph([singleApi]);
        await createProgram().parseAsync(buildArgs(override));
        const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
        expect(output).toMatchObject({
          success: false,
          error: {
 code: CliErrorCode.ValidationError,
message 
},
        });
      },
    );
  });
});
