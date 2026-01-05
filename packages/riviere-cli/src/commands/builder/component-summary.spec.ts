import {
  describe, it, expect 
} from 'vitest';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import type { TestContext } from '../../command-test-fixtures';
import {
  createTestContext,
  setupCommandTest,
  createGraph,
  baseMetadata,
  sourceLocation,
  parseErrorOutput,
  parseSuccessOutput,
  hasSuccessOutputStructure,
  testCommandRegistration,
  testCustomGraphPath,
} from '../../command-test-fixtures';

interface ComponentSummaryOutput {
  success: true;
  data: {
    componentCount: number;
    componentsByType: {
      UI: number;
      API: number;
      UseCase: number;
      DomainOp: number;
      Event: number;
      EventHandler: number;
      Custom: number;
    };
    linkCount: number;
    externalLinkCount: number;
    domainCount: number;
  };
  warnings: string[];
}

function isComponentSummaryOutput(value: unknown): value is ComponentSummaryOutput {
  if (!hasSuccessOutputStructure(value)) return false;
  if (!('componentCount' in value.data) || typeof value.data.componentCount !== 'number')
    return false;
  if (!('componentsByType' in value.data)) return false;
  return true;
}

function parseSummaryOutput(consoleOutput: string[]): ComponentSummaryOutput {
  return parseSuccessOutput(
    consoleOutput,
    isComponentSummaryOutput,
    'Invalid component-summary output',
  );
}

describe('riviere builder component-summary', () => {
  describe('command registration', () => {
    testCommandRegistration('component-summary');
  });

  describe('error handling', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync([
        'node',
        'riviere',
        'builder',
        'component-summary',
        '--json',
      ]);
      const output = parseErrorOutput(ctx.consoleOutput);
      expect(output.error.code).toBe(CliErrorCode.GraphNotFound);
    });

    it('uses custom graph path when --graph provided', async () => {
      const output = await testCustomGraphPath(
        ctx,
        ['builder', 'component-summary'],
        parseSummaryOutput,
      );
      expect(output.success).toBe(true);
    });
  });

  describe('statistics output (--json)', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns stats with componentCount, componentsByType, linkCount, domainCount', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [
          {
            id: 'orders:checkout:api:place-order',
            name: 'place-order',
            type: 'API',
            domain: 'orders',
            module: 'checkout',
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
            sourceLocation,
          },
          {
            id: 'orders:checkout:usecase:place-order',
            name: 'place-order',
            type: 'UseCase',
            domain: 'orders',
            module: 'checkout',
            sourceLocation,
          },
        ],
        links: [
          {
            id: 'orders:checkout:api:place-order→orders:checkout:usecase:place-order:sync',
            source: 'orders:checkout:api:place-order',
            target: 'orders:checkout:usecase:place-order',
            type: 'sync',
          },
        ],
      });

      await createProgram().parseAsync([
        'node',
        'riviere',
        'builder',
        'component-summary',
        '--json',
      ]);
      const output = parseSummaryOutput(ctx.consoleOutput);

      expect(output.data.componentCount).toBe(2);
      expect(output.data.linkCount).toBe(1);
      expect(output.data.domainCount).toBe(1);
      expect(output.data.componentsByType.API).toBe(1);
      expect(output.data.componentsByType.UseCase).toBe(1);
    });

    it('returns componentsByType with all 7 type counts', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [],
      });

      await createProgram().parseAsync([
        'node',
        'riviere',
        'builder',
        'component-summary',
        '--json',
      ]);
      const output = parseSummaryOutput(ctx.consoleOutput);

      expect(output.data.componentsByType).toEqual({
        UI: 0,
        API: 0,
        UseCase: 0,
        DomainOp: 0,
        Event: 0,
        EventHandler: 0,
        Custom: 0,
      });
    });

    it('returns zero counts for empty graph', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [],
      });

      await createProgram().parseAsync([
        'node',
        'riviere',
        'builder',
        'component-summary',
        '--json',
      ]);
      const output = parseSummaryOutput(ctx.consoleOutput);

      expect(output.data.componentCount).toBe(0);
      expect(output.data.linkCount).toBe(0);
      expect(output.data.externalLinkCount).toBe(0);
    });
  });

  describe('human output (no --json)', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('produces no output when --json flag not provided', async () => {
      await createGraph(ctx.testDir, {
        version: '1.0',
        metadata: baseMetadata,
        components: [],
        links: [],
      });

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'component-summary']);
      expect(ctx.consoleOutput).toHaveLength(0);
    });
  });
});
