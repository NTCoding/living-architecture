import {
  describe, it, expect 
} from 'vitest';
import { RiviereQuery } from './RiviereQuery';
import {
  createMinimalValidGraph,
  defaultSourceLocation,
  createAPIComponent,
} from './riviere-graph-fixtures';
import type { RiviereGraph } from '@living-architecture/riviere-schema';

describe('diff', () => {
  describe('components', () => {
    it('returns component in added when new component exists in other graph', () => {
      const baseGraph = createMinimalValidGraph();
      const otherGraph: RiviereGraph = {
        ...baseGraph,
        components: [
          ...baseGraph.components,
          {
            id: 'test:mod:api:new',
            type: 'API',
            name: 'New API',
            domain: 'test',
            module: 'mod',
            apiType: 'REST',
            sourceLocation: defaultSourceLocation,
          },
        ],
      };

      const query = new RiviereQuery(baseGraph);
      const result = query.diff(otherGraph);

      expect(result.components.added).toHaveLength(1);
      expect(result.components.added[0]?.id).toBe('test:mod:api:new');
    });

    it('returns component in removed when component missing from other graph', () => {
      const baseGraph = createMinimalValidGraph();
      const otherGraph: RiviereGraph = {
        ...baseGraph,
        components: [],
      };

      const query = new RiviereQuery(baseGraph);
      const result = query.diff(otherGraph);

      expect(result.components.removed).toHaveLength(1);
      expect(result.components.removed[0]?.id).toBe('test:mod:ui:page');
    });

    it('returns component in modified with changedFields when component name changes', () => {
      const baseGraph = createMinimalValidGraph();
      const originalComponent = baseGraph.components[0];
      if (!originalComponent) {
        throw new Error('Expected component to exist');
      }
      const otherGraph: RiviereGraph = {
        ...baseGraph,
        components: [
          {
            ...originalComponent,
            name: 'Renamed Page',
          },
        ],
      };

      const query = new RiviereQuery(baseGraph);
      const result = query.diff(otherGraph);

      expect(result.components.modified).toHaveLength(1);
      expect(result.components.modified[0]?.id).toBe('test:mod:ui:page');
      expect(result.components.modified[0]?.changedFields).toContain('name');
      expect(result.components.modified[0]?.before.name).toBe('Test Page');
      expect(result.components.modified[0]?.after.name).toBe('Renamed Page');
    });

    it('returns empty diff when graphs are identical', () => {
      const graph = createMinimalValidGraph();

      const query = new RiviereQuery(graph);
      const result = query.diff(graph);

      expect(result.components.added).toHaveLength(0);
      expect(result.components.removed).toHaveLength(0);
      expect(result.components.modified).toHaveLength(0);
      expect(result.links.added).toHaveLength(0);
      expect(result.links.removed).toHaveLength(0);
    });
  });

  describe('links', () => {
    it('returns link in links.added when new link exists in other graph', () => {
      const baseGraph = createMinimalValidGraph();
      baseGraph.components.push(
        createAPIComponent({
          id: 'test:mod:api:endpoint',
          name: 'Test API',
          domain: 'test',
        }),
      );
      const otherGraph: RiviereGraph = {
        ...baseGraph,
        components: [...baseGraph.components],
        links: [
          {
            source: 'test:mod:ui:page',
            target: 'test:mod:api:endpoint',
          },
        ],
      };

      const query = new RiviereQuery(baseGraph);
      const result = query.diff(otherGraph);

      expect(result.links.added).toHaveLength(1);
      expect(result.links.added[0]?.source).toBe('test:mod:ui:page');
      expect(result.links.added[0]?.target).toBe('test:mod:api:endpoint');
    });

    it('returns link in links.removed when link missing from other graph', () => {
      const baseGraph = createMinimalValidGraph();
      baseGraph.components.push(
        createAPIComponent({
          id: 'test:mod:api:endpoint',
          name: 'Test API',
          domain: 'test',
        }),
      );
      baseGraph.links = [
        {
          source: 'test:mod:ui:page',
          target: 'test:mod:api:endpoint',
        },
      ];
      const otherGraph: RiviereGraph = {
        ...baseGraph,
        components: [...baseGraph.components],
        links: [],
      };

      const query = new RiviereQuery(baseGraph);
      const result = query.diff(otherGraph);

      expect(result.links.removed).toHaveLength(1);
      expect(result.links.removed[0]?.source).toBe('test:mod:ui:page');
      expect(result.links.removed[0]?.target).toBe('test:mod:api:endpoint');
    });

    it('uses link id for comparison when link has explicit id', () => {
      const baseGraph = createMinimalValidGraph();
      baseGraph.components.push(
        createAPIComponent({
          id: 'test:mod:api:endpoint',
          name: 'Test API',
          domain: 'test',
        }),
      );
      baseGraph.links = [
        {
          id: 'link-1',
          source: 'test:mod:ui:page',
          target: 'test:mod:api:endpoint',
        },
      ];
      const otherGraph: RiviereGraph = {
        ...baseGraph,
        components: [...baseGraph.components],
        links: [
          {
            id: 'link-1',
            source: 'test:mod:ui:page',
            target: 'test:mod:api:endpoint',
          },
        ],
      };

      const query = new RiviereQuery(baseGraph);
      const result = query.diff(otherGraph);

      expect(result.links.added).toHaveLength(0);
      expect(result.links.removed).toHaveLength(0);
    });
  });
});
