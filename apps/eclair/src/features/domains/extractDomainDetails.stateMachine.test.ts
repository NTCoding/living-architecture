import {
 describe, it, expect 
} from 'vitest';
import { extractDomainDetails } from './extractDomainDetails';
import {
  parseNode,
  parseDomainMetadata,
  parseDomainKey,
  type RawNode,
} from '@/lib/riviereTestData';
import type { RiviereGraph } from '@/types/riviere';

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
};

function createMinimalGraph(overrides: Partial<RiviereGraph> = {}): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'Test Graph',
      domains: parseDomainMetadata({}),
    },
    components: [],
    links: [],
    ...overrides,
  };
}

function createNode(overrides: Partial<RawNode> = {}): ReturnType<typeof parseNode> {
  const nodeType = overrides.type ?? 'DomainOp';
  const base: RawNode = {
    sourceLocation: testSourceLocation,
    id: 'node-1',
    type: nodeType,
    name: 'Test Node',
    domain: 'test-domain',
    module: 'test-module',
    operationName: 'TestDomainOp',
  };
  return parseNode({
    ...base,
    ...overrides,
  });
}

describe('extractDomainDetails - entity state machine', () => {
  it('aggregates all unique states from operation stateChanges', () => {
    const graph = createMinimalGraph({
      metadata: {
        domains: parseDomainMetadata({
          'order-domain': {
            description: 'Orders',
            systemType: 'domain',
          },
        }),
      },
      components: [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          name: 'Order.begin()',
          domain: 'order-domain',
          entity: 'Order',
          operationName: 'begin',
          stateChanges: [
            {
              from: 'Draft',
              to: 'Placed',
            },
          ],
        }),
        createNode({
          id: 'op-2',
          type: 'DomainOp',
          name: 'Order.confirm()',
          domain: 'order-domain',
          entity: 'Order',
          operationName: 'confirm',
          stateChanges: [
            {
              from: 'Placed',
              to: 'Confirmed',
            },
          ],
        }),
        createNode({
          id: 'op-3',
          type: 'DomainOp',
          name: 'Order.ship()',
          domain: 'order-domain',
          entity: 'Order',
          operationName: 'ship',
          stateChanges: [
            {
              from: 'Confirmed',
              to: 'Shipped',
            },
          ],
        }),
      ],
    });

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'));
    const orderEntity = result?.entities.find((e) => e.name === 'Order');

    expect(orderEntity?.states).toEqual(['Draft', 'Placed', 'Confirmed', 'Shipped']);
  });
});
