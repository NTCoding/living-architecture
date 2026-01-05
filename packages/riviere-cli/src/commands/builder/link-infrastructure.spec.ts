import {
 describe, it, expect, vi 
} from 'vitest';
import {
 mkdir, writeFile 
} from 'node:fs/promises';
import { join } from 'node:path';
import { withGraphBuilder } from './link-infrastructure';
import { CliErrorCode } from '../../error-codes';
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../command-test-fixtures';

describe('link-infrastructure', () => {
  describe('withGraphBuilder', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('reports graph not found when graph does not exist', async () => {
      const handler = vi.fn();

      await withGraphBuilder(undefined, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: { code: CliErrorCode.GraphNotFound },
      });
    });

    it('calls handler with builder and graphPath when graph exists', async () => {
      const graphDir = join(ctx.testDir, '.riviere');
      await mkdir(graphDir, { recursive: true });
      const graph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
test: {
 description: 'Test domain',
systemType: 'domain' 
},
},
        },
        components: [],
        links: [],
      };
      await writeFile(
        join(graphDir, 'graph.json'),
        JSON.stringify(graph),
        'utf-8',
      );

      const handler = vi.fn();
      await withGraphBuilder(undefined, handler);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({}),
        expect.stringContaining('.riviere/graph.json'),
      );
    });

    it('uses custom graph path when provided', async () => {
      const customPath = join(ctx.testDir, 'custom', 'graph.json');
      await mkdir(join(ctx.testDir, 'custom'), { recursive: true });
      const graph = {
        version: '1.0',
        metadata: {
          sources: [{ repository: 'https://github.com/org/repo' }],
          domains: {
test: {
 description: 'Test domain',
systemType: 'domain' 
},
},
        },
        components: [],
        links: [],
      };
      await writeFile(customPath, JSON.stringify(graph), 'utf-8');

      const handler = vi.fn();
      await withGraphBuilder(customPath, handler);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({}),
        customPath,
      );
    });
  });
});
