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

interface ChecklistComponent {
  id: string;
  type: string;
  name: string;
  domain: string;
}

interface ChecklistOutput {
  success: true;
  data: {
    total: number;
    components: ChecklistComponent[];
  };
  warnings: string[];
}

function isChecklistOutput(value: unknown): value is ChecklistOutput {
  if (!hasSuccessOutputStructure(value)) return false;
  if (!('total' in value.data) || typeof value.data.total !== 'number') return false;
  if (!('components' in value.data) || !Array.isArray(value.data.components)) return false;
  return true;
}

function parseChecklistOutput(consoleOutput: string[]): ChecklistOutput {
  return parseSuccessOutput(consoleOutput, isChecklistOutput, 'Invalid component-checklist output');
}

describe('riviere builder component-checklist', () => {
  describe('command registration', () => {
    testCommandRegistration('component-checklist');
  });

  describe('error handling', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      await createProgram().parseAsync([
        'node',
        'riviere',
        'builder',
        'component-checklist',
        '--json',
      ]);
      const output = parseErrorOutput(ctx.consoleOutput);
      expect(output.error.code).toBe(CliErrorCode.GraphNotFound);
    });

    it('returns INVALID_COMPONENT_TYPE when --type value invalid', async () => {
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
        'component-checklist',
        '--type',
        'InvalidType',
        '--json',
      ]);
      const output = parseErrorOutput(ctx.consoleOutput);
      expect(output.error.code).toBe(CliErrorCode.InvalidComponentType);
    });

    it('uses custom graph path when --graph provided', async () => {
      const output = await testCustomGraphPath(
        ctx,
        ['builder', 'component-checklist'],
        parseChecklistOutput,
      );
      expect(output.success).toBe(true);
    });
  });

  describe('checklist output (--json)', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns all components with id, type, name, domain fields', async () => {
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
        links: [],
      });

      await createProgram().parseAsync([
        'node',
        'riviere',
        'builder',
        'component-checklist',
        '--json',
      ]);
      const output = parseChecklistOutput(ctx.consoleOutput);

      expect(output.data.total).toBe(2);
      expect(output.data.components).toHaveLength(2);
      expect(output.data.components[0]).toMatchObject({
        id: 'orders:checkout:api:place-order',
        type: 'API',
        name: 'place-order',
        domain: 'orders',
      });
    });

    it('returns empty array when graph has no components', async () => {
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
        'component-checklist',
        '--json',
      ]);
      const output = parseChecklistOutput(ctx.consoleOutput);

      expect(output.data.total).toBe(0);
      expect(output.data.components).toHaveLength(0);
    });

    it('filters by component type when --type DomainOp provided', async () => {
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
            id: 'orders:checkout:domain-op:place-order',
            name: 'place-order',
            type: 'DomainOp',
            domain: 'orders',
            module: 'checkout',
            operationName: 'placeOrder',
            sourceLocation,
          },
        ],
        links: [],
      });

      await createProgram().parseAsync([
        'node',
        'riviere',
        'builder',
        'component-checklist',
        '--type',
        'DomainOp',
        '--json',
      ]);
      const output = parseChecklistOutput(ctx.consoleOutput);

      expect(output.data.total).toBe(1);
      expect(output.data.components).toHaveLength(1);
      expect(output.data.components[0]?.type).toBe('DomainOp');
    });

    it('filters by component type when --type API provided', async () => {
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
        links: [],
      });

      await createProgram().parseAsync([
        'node',
        'riviere',
        'builder',
        'component-checklist',
        '--type',
        'API',
        '--json',
      ]);
      const output = parseChecklistOutput(ctx.consoleOutput);

      expect(output.data.total).toBe(1);
      expect(output.data.components).toHaveLength(1);
      expect(output.data.components[0]?.type).toBe('API');
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

      await createProgram().parseAsync(['node', 'riviere', 'builder', 'component-checklist']);
      expect(ctx.consoleOutput).toHaveLength(0);
    });
  });
});
