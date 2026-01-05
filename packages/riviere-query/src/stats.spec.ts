import {
  describe, it, expect 
} from 'vitest';
import { RiviereQuery } from './RiviereQuery';
import type { RiviereGraph } from '@living-architecture/riviere-schema';
import {
  createMinimalValidGraph,
  createAPIComponent,
  createEventComponent,
  createDomainOpComponent,
  defaultSourceLocation,
} from './riviere-graph-fixtures';

describe('stats', () => {
  it('returns componentCount matching number of components', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createAPIComponent({
        id: 'test:mod:api:one',
        name: 'API One',
        domain: 'test',
      }),
    );

    const query = new RiviereQuery(graph);
    const result = query.stats();

    expect(result.componentCount).toBe(2);
  });

  it('returns linkCount matching number of links', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createAPIComponent({
        id: 'test:mod:api:one',
        name: 'API One',
        domain: 'test',
      }),
    );
    graph.links = [
      {
        source: 'test:mod:ui:page',
        target: 'test:mod:api:one',
      },
      {
        source: 'test:mod:api:one',
        target: 'test:mod:ui:page',
      },
    ];

    const query = new RiviereQuery(graph);
    const result = query.stats();

    expect(result.linkCount).toBe(2);
  });

  it('returns domainCount counting unique domains', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: {
          orders: {
            description: 'Orders domain',
            systemType: 'domain',
          },
          shipping: {
            description: 'Shipping domain',
            systemType: 'domain',
          },
        },
      },
      components: [
        {
          id: 'orders:mod:ui:page1',
          type: 'UI',
          name: 'Page 1',
          domain: 'orders',
          module: 'mod',
          route: '/p1',
          sourceLocation: defaultSourceLocation,
        },
        {
          id: 'orders:mod:ui:page2',
          type: 'UI',
          name: 'Page 2',
          domain: 'orders',
          module: 'mod',
          route: '/p2',
          sourceLocation: defaultSourceLocation,
        },
        {
          id: 'shipping:mod:ui:page3',
          type: 'UI',
          name: 'Page 3',
          domain: 'shipping',
          module: 'mod',
          route: '/p3',
          sourceLocation: defaultSourceLocation,
        },
      ],
      links: [],
    };

    const query = new RiviereQuery(graph);
    const result = query.stats();

    expect(result.domainCount).toBe(2);
  });

  it('returns apiCount counting only API components', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createAPIComponent({
        id: 'test:mod:api:one',
        name: 'API One',
        domain: 'test',
      }),
      createAPIComponent({
        id: 'test:mod:api:two',
        name: 'API Two',
        domain: 'test',
      }),
    );

    const query = new RiviereQuery(graph);
    const result = query.stats();

    expect(result.apiCount).toBe(2);
  });

  it('returns entityCount counting unique entities from DomainOp components', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createDomainOpComponent({
        id: 'test:mod:op:create',
        name: 'Create Order',
        domain: 'test',
        operationName: 'create',
        entity: 'Order',
      }),
      createDomainOpComponent({
        id: 'test:mod:op:update',
        name: 'Update Order',
        domain: 'test',
        operationName: 'update',
        entity: 'Order',
      }),
      createDomainOpComponent({
        id: 'test:mod:op:ship',
        name: 'Create Shipment',
        domain: 'test',
        operationName: 'create',
        entity: 'Shipment',
      }),
    );

    const query = new RiviereQuery(graph);
    const result = query.stats();

    expect(result.entityCount).toBe(2);
  });

  it('returns eventCount counting only Event components', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createEventComponent({
        id: 'test:mod:event:one',
        name: 'Order Created',
        domain: 'test',
        eventName: 'OrderCreated',
      }),
      createEventComponent({
        id: 'test:mod:event:two',
        name: 'Order Shipped',
        domain: 'test',
        eventName: 'OrderShipped',
      }),
    );

    const query = new RiviereQuery(graph);
    const result = query.stats();

    expect(result.eventCount).toBe(2);
  });

  it('returns zeros for graph with no components', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: {
          test: {
            description: 'Test',
            systemType: 'domain',
          },
        },
      },
      components: [],
      links: [],
    };

    const query = new RiviereQuery(graph);
    const result = query.stats();

    expect(result).toEqual({
      componentCount: 0,
      linkCount: 0,
      domainCount: 0,
      apiCount: 0,
      entityCount: 0,
      eventCount: 0,
    });
  });
});
