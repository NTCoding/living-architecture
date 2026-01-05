import {
  describe, it, expect 
} from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
  createGraphWithDomain,
} from '../../command-test-fixtures';

describe('riviere builder define-custom-type', () => {
  describe('command registration', () => {
    it('registers define-custom-type command under builder', () => {
      const program = createProgram();
      const builderCmd = program.commands.find(
        (cmd) => cmd.name() === 'builder',
      );
      const defineCustomTypeCmd = builderCmd?.commands.find(
        (cmd) => cmd.name() === 'define-custom-type',
      );

      expect(defineCustomTypeCmd?.name()).toBe('define-custom-type');
    });
  });

  describe('defining custom type', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('stores custom type in graph metadata when name provided', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'define-custom-type',
        '--name',
        'MessageQueue',
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({metadata: {customTypes: {MessageQueue: {},},},});
    });

    it('stores description when provided', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'define-custom-type',
        '--name',
        'MessageQueue',
        '--description',
        'Async message queue',
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({metadata: {customTypes: {MessageQueue: {description: 'Async message queue',},},},});
    });

    it('stores required properties when provided', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'define-custom-type',
        '--name',
        'DataStore',
        '--required-property',
        'tableName:string:Table name',
        '--required-property',
        'partitionKey:string',
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        metadata: {
          customTypes: {
            DataStore: {
              requiredProperties: {
                tableName: {
                  type: 'string',
                  description: 'Table name' 
                },
                partitionKey: { type: 'string' },
              },
            },
          },
        },
      });
    });

    it('stores optional properties when provided', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'define-custom-type',
        '--name',
        'Cache',
        '--optional-property',
        'ttlSeconds:number:Time to live',
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({
        metadata: {
          customTypes: {
            Cache: {
              optionalProperties: {
                ttlSeconds: {
                  type: 'number',
                  description: 'Time to live' 
                },
              },
            },
          },
        },
      });
    });

    it('outputs success JSON when --json flag provided', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'define-custom-type',
        '--name',
        'MessageQueue',
        '--description',
        'Async queue',
        '--required-property',
        'queueName:string',
        '--optional-property',
        'ttl:number',
        '--json',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: true,
        data: {
          name: 'MessageQueue',
          description: 'Async queue',
          requiredProperties: { queueName: { type: 'string' } },
          optionalProperties: { ttl: { type: 'number' } },
        },
      });
    });
  });

  describe('error handling', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'define-custom-type',
        '--name',
        'MessageQueue',
      ]);

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.GraphNotFound);
    });

    it('returns VALIDATION_ERROR for invalid property type', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'define-custom-type',
        '--name',
        'MessageQueue',
        '--required-property',
        'queueName:invalid',
      ]);

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.ValidationError);
      expect(output).toContain('Invalid property type');
    });

    it('returns VALIDATION_ERROR for malformed property spec', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'define-custom-type',
        '--name',
        'MessageQueue',
        '--required-property',
        'missing-type',
      ]);

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.ValidationError);
      expect(output).toContain('Invalid property format');
    });

    it('returns VALIDATION_ERROR for empty property name', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'define-custom-type',
        '--name',
        'MessageQueue',
        '--required-property',
        ':string',
      ]);

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.ValidationError);
      expect(output).toContain('Property name cannot be empty');
    });

    it('returns VALIDATION_ERROR for duplicate property names', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'define-custom-type',
        '--name',
        'MessageQueue',
        '--required-property',
        'name:string',
        '--required-property',
        'name:number',
      ]);

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.ValidationError);
      expect(output).toContain('Duplicate property name');
    });

    it('returns VALIDATION_ERROR for invalid optional property', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'define-custom-type',
        '--name',
        'MessageQueue',
        '--optional-property',
        'badProp',
      ]);

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.ValidationError);
      expect(output).toContain('Invalid property format');
    });
  });
});
