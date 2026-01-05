import {
  describe, it, expect 
} from 'vitest';
import { computeGraphStats } from './graphStats';
import type {
  RiviereGraph, SourceLocation 
} from '@/types/riviere';
import {
  parseNode, parseEdge, parseDomainKey, parseDomainMetadata 
} from './riviereTestFixtures';

const testSourceLocation: SourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
};

function createMinimalGraph(overrides: Partial<RiviereGraph> = {}): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'Test Graph',
      domains: parseDomainMetadata({
        'test-domain': {
          description: 'Test domain',
          systemType: 'domain',
        },
      }),
    },
    components: [],
    links: [],
    ...overrides,
  };
}

describe('computeGraphStats', () => {
  it('returns zero counts for empty graph', () => {
    const graph = createMinimalGraph();

    const stats = computeGraphStats(graph);

    expect(stats).toEqual({
      totalNodes: 0,
      totalDomains: 1,
      totalApis: 0,
      totalEntities: 0,
      totalEvents: 0,
      totalEdges: 0,
    });
  });

  it('counts total nodes correctly', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'UI',
          name: 'UI 1',
          domain: 'd1',
          module: 'm1',
          route: '/ui1',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'API',
          name: 'API 1',
          domain: 'd1',
          module: 'm1',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n3',
          type: 'UseCase',
          name: 'UC 1',
          domain: 'd1',
          module: 'm1',
        }),
      ],
    });

    const stats = computeGraphStats(graph);

    expect(stats.totalNodes).toBe(3);
  });

  it('counts unique domains from metadata', () => {
    const graph = createMinimalGraph({
      metadata: {
        domains: {
          [parseDomainKey('order-domain')]: {
            description: 'Order domain',
            systemType: 'domain',
          },
          [parseDomainKey('payment-domain')]: {
            description: 'Payment domain',
            systemType: 'domain',
          },
          [parseDomainKey('shipping-domain')]: {
            description: 'Shipping domain',
            systemType: 'domain',
          },
        },
      },
    });

    const stats = computeGraphStats(graph);

    expect(stats.totalDomains).toBe(3);
  });

  it('counts API nodes correctly', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'API',
          name: 'API 1',
          domain: 'd1',
          module: 'm1',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'API',
          name: 'API 2',
          domain: 'd1',
          module: 'm1',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n3',
          type: 'UI',
          name: 'UI 1',
          domain: 'd1',
          module: 'm1',
          route: '/ui1',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n4',
          type: 'UseCase',
          name: 'UC 1',
          domain: 'd1',
          module: 'm1',
        }),
      ],
    });

    const stats = computeGraphStats(graph);

    expect(stats.totalApis).toBe(2);
  });

  it('counts unique entities from DomainOp nodes', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'DomainOp',
          name: 'Order.begin',
          domain: 'd1',
          module: 'm1',
          entity: 'Order',
          operationName: 'begin',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'DomainOp',
          name: 'Order.cancel',
          domain: 'd1',
          module: 'm1',
          entity: 'Order',
          operationName: 'cancel',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n3',
          type: 'DomainOp',
          name: 'Payment.authorize',
          domain: 'd1',
          module: 'm1',
          entity: 'Payment',
          operationName: 'authorize',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n4',
          type: 'UseCase',
          name: 'UC 1',
          domain: 'd1',
          module: 'm1',
        }),
      ],
    });

    const stats = computeGraphStats(graph);

    expect(stats.totalEntities).toBe(2);
  });

  it('counts Event nodes correctly', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'Event',
          name: 'OrderPlaced',
          domain: 'd1',
          module: 'm1',
          eventName: 'OrderPlaced',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'Event',
          name: 'PaymentAuthorized',
          domain: 'd1',
          module: 'm1',
          eventName: 'PaymentAuthorized',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n3',
          type: 'Event',
          name: 'ShipmentCreated',
          domain: 'd1',
          module: 'm1',
          eventName: 'ShipmentCreated',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n4',
          type: 'EventHandler',
          name: 'Handler 1',
          domain: 'd1',
          module: 'm1',
          subscribedEvents: ['OrderPlaced'],
        }),
      ],
    });

    const stats = computeGraphStats(graph);

    expect(stats.totalEvents).toBe(3);
  });

  it('counts total edges correctly', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'UI',
          name: 'UI 1',
          domain: 'd1',
          module: 'm1',
          route: '/ui1',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'API',
          name: 'API 1',
          domain: 'd1',
          module: 'm1',
        }),
      ],
      links: [
        parseEdge({
          source: 'n1',
          target: 'n2',
        }),
        parseEdge({
          source: 'n2',
          target: 'n1',
        }),
      ],
    });

    const stats = computeGraphStats(graph);

    expect(stats.totalEdges).toBe(2);
  });
});
