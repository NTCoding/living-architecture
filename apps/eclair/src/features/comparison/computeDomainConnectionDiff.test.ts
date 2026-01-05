import {
  describe, it, expect 
} from 'vitest';
import { computeDomainConnectionDiff } from './computeDomainConnectionDiff';
import type { RiviereGraph } from '@/types/riviere';
import {
  parseNode, parseEdge, parseDomainMetadata 
} from '@/lib/riviereTestFixtures';

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
};

function createGraph(
  nodes: ReturnType<typeof parseNode>[],
  edges: ReturnType<typeof parseEdge>[],
  domains: Record<
    string,
    {
      description: string;
      systemType: 'domain' | 'bff' | 'ui' | 'other';
    }
  >,
): RiviereGraph {
  return {
    version: '1.0',
    metadata: { domains: parseDomainMetadata(domains) },
    components: nodes,
    links: edges,
  };
}

describe('computeDomainConnectionDiff', () => {
  describe('domain extraction', () => {
    it('returns all domains from both before and after graphs', () => {
      const before = createGraph(
        [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm',
          }),
        ],
        [],
        {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
        },
      );
      const after = createGraph(
        [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'API',
            name: 'API 2',
            domain: 'payments',
            module: 'm',
          }),
        ],
        [],
        {
          payments: {
            description: 'Payments',
            systemType: 'domain',
          },
        },
      );

      const result = computeDomainConnectionDiff(before, after);

      expect(result.domains).toContain('orders');
      expect(result.domains).toContain('payments');
    });
  });

  describe('connection changes', () => {
    it('identifies added connection when edge exists only in after graph', () => {
      const before = createGraph(
        [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'UseCase',
            name: 'UC 1',
            domain: 'payments',
            module: 'm',
          }),
        ],
        [],
        {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
          payments: {
            description: 'Payments',
            systemType: 'domain',
          },
        },
      );
      const after = createGraph(
        [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'UseCase',
            name: 'UC 1',
            domain: 'payments',
            module: 'm',
          }),
        ],
        [
          parseEdge({
            source: 'n1',
            target: 'n2',
            type: 'sync',
          }),
        ],
        {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
          payments: {
            description: 'Payments',
            systemType: 'domain',
          },
        },
      );

      const result = computeDomainConnectionDiff(before, after);

      expect(result.connections.added).toHaveLength(1);
      expect(result.connections.added[0]?.source).toBe('orders');
      expect(result.connections.added[0]?.target).toBe('payments');
    });

    it('identifies removed connection when edge exists only in before graph', () => {
      const before = createGraph(
        [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'UseCase',
            name: 'UC 1',
            domain: 'payments',
            module: 'm',
          }),
        ],
        [
          parseEdge({
            source: 'n1',
            target: 'n2',
            type: 'sync',
          }),
        ],
        {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
          payments: {
            description: 'Payments',
            systemType: 'domain',
          },
        },
      );
      const after = createGraph(
        [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'UseCase',
            name: 'UC 1',
            domain: 'payments',
            module: 'm',
          }),
        ],
        [],
        {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
          payments: {
            description: 'Payments',
            systemType: 'domain',
          },
        },
      );

      const result = computeDomainConnectionDiff(before, after);

      expect(result.connections.removed).toHaveLength(1);
      expect(result.connections.removed[0]?.source).toBe('orders');
      expect(result.connections.removed[0]?.target).toBe('payments');
    });

    it('identifies unchanged connection when edge exists in both graphs', () => {
      const before = createGraph(
        [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'UseCase',
            name: 'UC 1',
            domain: 'payments',
            module: 'm',
          }),
        ],
        [
          parseEdge({
            source: 'n1',
            target: 'n2',
            type: 'sync',
          }),
        ],
        {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
          payments: {
            description: 'Payments',
            systemType: 'domain',
          },
        },
      );
      const after = createGraph(
        [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'UseCase',
            name: 'UC 1',
            domain: 'payments',
            module: 'm',
          }),
        ],
        [
          parseEdge({
            source: 'n1',
            target: 'n2',
            type: 'sync',
          }),
        ],
        {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
          payments: {
            description: 'Payments',
            systemType: 'domain',
          },
        },
      );

      const result = computeDomainConnectionDiff(before, after);

      expect(result.connections.unchanged).toHaveLength(1);
      expect(result.connections.unchanged[0]?.source).toBe('orders');
      expect(result.connections.unchanged[0]?.target).toBe('payments');
    });
  });
});
