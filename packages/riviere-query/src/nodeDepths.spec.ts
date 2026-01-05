import {
  describe, it, expect 
} from 'vitest';
import {
  RiviereQuery, parseComponentId 
} from './RiviereQuery';
import {
  createMinimalValidGraph,
  createAPIComponent,
  createUseCaseComponent,
  defaultSourceLocation,
} from './riviere-graph-fixtures';
import type { RiviereGraph } from '@living-architecture/riviere-schema';

describe('nodeDepths', () => {
  it('returns depth 0 for entry points', () => {
    const graph = createMinimalValidGraph();

    const query = new RiviereQuery(graph);
    const depths = query.nodeDepths();

    expect(depths.get(parseComponentId('test:mod:ui:page'))).toBe(0);
  });

  it('returns depth based on hops from entry point', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createAPIComponent({
        id: 'test:mod:api:users',
        name: 'Users API',
        domain: 'test',
      }),
      createUseCaseComponent({
        id: 'test:mod:uc:getUser',
        name: 'Get User',
        domain: 'test',
      }),
    );
    graph.links = [
      {
        source: 'test:mod:ui:page',
        target: 'test:mod:api:users',
      },
      {
        source: 'test:mod:api:users',
        target: 'test:mod:uc:getUser',
      },
    ];

    const query = new RiviereQuery(graph);
    const depths = query.nodeDepths();

    expect(depths.get(parseComponentId('test:mod:ui:page'))).toBe(0);
    expect(depths.get(parseComponentId('test:mod:api:users'))).toBe(1);
    expect(depths.get(parseComponentId('test:mod:uc:getUser'))).toBe(2);
  });

  it('returns minimum depth when reachable from multiple entry points', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createAPIComponent({
        id: 'test:mod:api:direct',
        name: 'Direct API',
        domain: 'test',
      }),
      createUseCaseComponent({
        id: 'test:mod:uc:shared',
        name: 'Shared UC',
        domain: 'test',
      }),
    );
    graph.links = [
      {
        source: 'test:mod:ui:page',
        target: 'test:mod:uc:shared',
      },
      {
        source: 'test:mod:api:direct',
        target: 'test:mod:uc:shared',
      },
    ];

    const query = new RiviereQuery(graph);
    const depths = query.nodeDepths();

    expect(depths.get(parseComponentId('test:mod:ui:page'))).toBe(0);
    expect(depths.get(parseComponentId('test:mod:api:direct'))).toBe(0);
    expect(depths.get(parseComponentId('test:mod:uc:shared'))).toBe(1);
  });

  it('excludes unreachable nodes from result', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createUseCaseComponent({
        id: 'test:mod:uc:orphan',
        name: 'Orphan',
        domain: 'test',
      }),
    );

    const query = new RiviereQuery(graph);
    const depths = query.nodeDepths();

    expect(depths.get(parseComponentId('test:mod:ui:page'))).toBe(0);
    expect(depths.has(parseComponentId('test:mod:uc:orphan'))).toBe(false);
  });

  it('handles source with multiple outgoing links', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createUseCaseComponent({
        id: 'test:mod:uc:a',
        name: 'UC A',
        domain: 'test',
      }),
      createUseCaseComponent({
        id: 'test:mod:uc:b',
        name: 'UC B',
        domain: 'test',
      }),
    );
    graph.links = [
      {
        source: 'test:mod:ui:page',
        target: 'test:mod:uc:a',
      },
      {
        source: 'test:mod:ui:page',
        target: 'test:mod:uc:b',
      },
    ];

    const query = new RiviereQuery(graph);
    const depths = query.nodeDepths();

    expect(depths.get(parseComponentId('test:mod:ui:page'))).toBe(0);
    expect(depths.get(parseComponentId('test:mod:uc:a'))).toBe(1);
    expect(depths.get(parseComponentId('test:mod:uc:b'))).toBe(1);
  });

  it('returns empty map for graph with no entry points', () => {
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
      components: [
        {
          id: 'test:mod:uc:a',
          type: 'UseCase',
          name: 'A',
          domain: 'test',
          module: 'mod',
          sourceLocation: defaultSourceLocation,
        },
        {
          id: 'test:mod:uc:b',
          type: 'UseCase',
          name: 'B',
          domain: 'test',
          module: 'mod',
          sourceLocation: defaultSourceLocation,
        },
      ],
      links: [
        {
          source: 'test:mod:uc:a',
          target: 'test:mod:uc:b',
        },
      ],
    };

    const query = new RiviereQuery(graph);
    const depths = query.nodeDepths();

    expect(depths.size).toBe(0);
  });
});
