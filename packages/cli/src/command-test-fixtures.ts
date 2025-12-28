import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi, beforeEach, afterEach } from 'vitest';

export interface TestContext {
  testDir: string;
  originalCwd: string;
  consoleOutput: string[];
}

export function createTestContext(): TestContext {
  return {
    testDir: '',
    originalCwd: '',
    consoleOutput: [],
  };
}

export function setupCommandTest(ctx: TestContext): void {
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
}

export async function createGraph(testDir: string, graphData: object, subPath = '.riviere'): Promise<string> {
  const graphDir = join(testDir, subPath);
  await mkdir(graphDir, { recursive: true });
  const graphPath = join(graphDir, 'graph.json');
  await writeFile(graphPath, JSON.stringify(graphData), 'utf-8');
  return graphPath;
}

export const baseMetadata = {
  sources: [{ repository: 'https://github.com/org/repo' }],
  domains: { orders: { description: 'Order management', systemType: 'domain' } },
};

export const sourceLocation = { repository: 'https://github.com/org/repo', filePath: 'src/orders/handler.ts' };

export const useCaseComponent = {
  id: 'orders:checkout:usecase:place-order',
  type: 'UseCase',
  name: 'place-order',
  domain: 'orders',
  module: 'checkout',
  sourceLocation,
};

export const apiComponent = {
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

export const eventHandlerComponent = {
  id: 'orders:checkout:eventhandler:on-order-placed',
  type: 'EventHandler',
  name: 'on-order-placed',
  domain: 'orders',
  module: 'checkout',
  sourceLocation,
  subscribedEvents: ['OrderPlaced'],
};

export const validLink = {
  id: 'orders:checkout:api:place-order→orders:checkout:usecase:place-order:sync',
  source: 'orders:checkout:api:place-order',
  target: 'orders:checkout:usecase:place-order',
  type: 'sync',
};

export async function createGraphWithDomain(testDir: string, domainName: string): Promise<void> {
  const graphDir = join(testDir, '.riviere');
  await mkdir(graphDir, { recursive: true });
  const graph = {
    version: '1.0',
    metadata: {
      sources: [{ repository: 'https://github.com/org/repo' }],
      domains: { [domainName]: { description: 'Test domain', systemType: 'domain' } },
    },
    components: [],
    links: [],
  };
  await writeFile(join(graphDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
}
