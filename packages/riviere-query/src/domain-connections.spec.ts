import {
  describe, it, expect 
} from 'vitest';
import { RiviereQuery } from './RiviereQuery';
import {
  createMinimalValidGraph,
  createAPIComponent,
  createUseCaseComponent,
  createEventHandlerComponent,
} from './riviere-graph-fixtures';

describe('domainConnections', () => {
  it('returns empty array when domain has no connections to other domains', () => {
    const graph = createMinimalValidGraph();
    const query = new RiviereQuery(graph);

    const result = query.domainConnections('test');

    expect(result).toEqual([]);
  });

  it('returns outgoing connections with API counts when calling other domain APIs', () => {
    const graph = createMinimalValidGraph();
    graph.metadata.domains['orders'] = {
      description: 'Orders',
      systemType: 'domain',
    };
    graph.components.push(
      createUseCaseComponent({
        id: 'test:mod:usecase:caller',
        name: 'Caller',
        domain: 'test',
      }),
      createAPIComponent({
        id: 'orders:mod:api:create',
        name: 'Create',
        domain: 'orders',
      }),
      createAPIComponent({
        id: 'orders:mod:api:get',
        name: 'Get',
        domain: 'orders',
      }),
    );
    graph.links.push(
      {
        source: 'test:mod:usecase:caller',
        target: 'orders:mod:api:create',
        type: 'sync',
      },
      {
        source: 'test:mod:usecase:caller',
        target: 'orders:mod:api:get',
        type: 'sync',
      },
    );
    const query = new RiviereQuery(graph);

    const result = query.domainConnections('test');

    expect(result).toEqual([
      {
        targetDomain: 'orders',
        direction: 'outgoing',
        apiCount: 2,
        eventCount: 0,
      },
    ]);
  });

  it('returns outgoing connections with event counts when triggering event handlers', () => {
    const graph = createMinimalValidGraph();
    graph.metadata.domains['notifications'] = {
      description: 'Notifications',
      systemType: 'domain',
    };
    graph.components.push(
      createUseCaseComponent({
        id: 'test:mod:usecase:sender',
        name: 'Sender',
        domain: 'test',
      }),
      createEventHandlerComponent({
        id: 'notifications:mod:handler:notify',
        name: 'Notify',
        domain: 'notifications',
      }),
    );
    graph.links.push({
      source: 'test:mod:usecase:sender',
      target: 'notifications:mod:handler:notify',
      type: 'async',
    });
    const query = new RiviereQuery(graph);

    const result = query.domainConnections('test');

    expect(result).toEqual([
      {
        targetDomain: 'notifications',
        direction: 'outgoing',
        apiCount: 0,
        eventCount: 1,
      },
    ]);
  });

  it('returns incoming connections when other domains call this domain', () => {
    const graph = createMinimalValidGraph();
    graph.metadata.domains['orders'] = {
      description: 'Orders',
      systemType: 'domain',
    };
    graph.components.push(
      createAPIComponent({
        id: 'test:mod:api:target',
        name: 'Target',
        domain: 'test',
      }),
      createUseCaseComponent({
        id: 'orders:mod:usecase:caller',
        name: 'Caller',
        domain: 'orders',
      }),
    );
    graph.links.push({
      source: 'orders:mod:usecase:caller',
      target: 'test:mod:api:target',
      type: 'sync',
    });
    const query = new RiviereQuery(graph);

    const result = query.domainConnections('test');

    expect(result).toEqual([
      {
        targetDomain: 'orders',
        direction: 'incoming',
        apiCount: 1,
        eventCount: 0,
      },
    ]);
  });

  it('returns both incoming and outgoing connections for bidirectional relationships', () => {
    const graph = createMinimalValidGraph();
    graph.metadata.domains['orders'] = {
      description: 'Orders',
      systemType: 'domain',
    };
    graph.components.push(
      createAPIComponent({
        id: 'test:mod:api:target',
        name: 'Target',
        domain: 'test',
      }),
      createAPIComponent({
        id: 'orders:mod:api:ordertarget',
        name: 'OrderTarget',
        domain: 'orders',
      }),
      createUseCaseComponent({
        id: 'test:mod:usecase:caller',
        name: 'Caller',
        domain: 'test',
      }),
      createUseCaseComponent({
        id: 'orders:mod:usecase:ordercaller',
        name: 'OrderCaller',
        domain: 'orders',
      }),
    );
    graph.links.push(
      {
        source: 'test:mod:usecase:caller',
        target: 'orders:mod:api:ordertarget',
        type: 'sync',
      },
      {
        source: 'orders:mod:usecase:ordercaller',
        target: 'test:mod:api:target',
        type: 'sync',
      },
    );
    const query = new RiviereQuery(graph);

    const result = query.domainConnections('test');

    expect(result).toContainEqual({
      targetDomain: 'orders',
      direction: 'outgoing',
      apiCount: 1,
      eventCount: 0,
    });
    expect(result).toContainEqual({
      targetDomain: 'orders',
      direction: 'incoming',
      apiCount: 1,
      eventCount: 0,
    });
  });

  it('returns results sorted by targetDomain', () => {
    const graph = createMinimalValidGraph();
    graph.metadata.domains['zebra'] = {
      description: 'Zebra',
      systemType: 'domain',
    };
    graph.metadata.domains['alpha'] = {
      description: 'Alpha',
      systemType: 'domain',
    };
    graph.components.push(
      createUseCaseComponent({
        id: 'test:mod:usecase:x',
        name: 'X',
        domain: 'test',
      }),
      createAPIComponent({
        id: 'zebra:mod:api:z',
        name: 'Z',
        domain: 'zebra',
      }),
      createAPIComponent({
        id: 'alpha:mod:api:a',
        name: 'A',
        domain: 'alpha',
      }),
    );
    graph.links.push(
      {
        source: 'test:mod:usecase:x',
        target: 'zebra:mod:api:z',
        type: 'sync',
      },
      {
        source: 'test:mod:usecase:x',
        target: 'alpha:mod:api:a',
        type: 'sync',
      },
    );
    const query = new RiviereQuery(graph);

    const result = query.domainConnections('test');

    expect(result.map((c) => c.targetDomain)).toEqual(['alpha', 'zebra']);
  });

  it('excludes links within the same domain from counts', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createUseCaseComponent({
        id: 'test:mod:usecase:internal',
        name: 'Internal',
        domain: 'test',
      }),
      createAPIComponent({
        id: 'test:mod:api:internalapi',
        name: 'InternalAPI',
        domain: 'test',
      }),
    );
    graph.links.push({
      source: 'test:mod:usecase:internal',
      target: 'test:mod:api:internalapi',
      type: 'sync',
    });
    const query = new RiviereQuery(graph);

    const result = query.domainConnections('test');

    expect(result).toEqual([]);
  });
});
