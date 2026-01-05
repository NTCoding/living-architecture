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
  createGraphWithCustomType,
} from '../../command-test-fixtures';

describe('riviere builder add-component Custom type', () => {
  const ctx: TestContext = createTestContext();
  setupCommandTest(ctx);

  it('stores custom properties directly on component when --custom-property provided', async () => {
    await createGraphWithCustomType(ctx.testDir, 'orders', 'BackgroundJob', {
      description: 'Scheduled background task',
      requiredProperties: {
        schedule: {
          type: 'string',
          description: 'Cron expression',
        },
      },
    });

    const program = createProgram();
    await program.parseAsync([
      'node',
      'riviere',
      'builder',
      'add-component',
      '--type',
      'Custom',
      '--custom-type',
      'BackgroundJob',
      '--name',
      'Order Cleanup',
      '--domain',
      'orders',
      '--module',
      'jobs',
      '--repository',
      'https://github.com/org/repo',
      '--file-path',
      'src/jobs/order-cleanup.ts',
      '--custom-property',
      'schedule:0 0 * * *',
    ]);

    const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
    const content = await readFile(graphPath, 'utf-8');
    const graph: unknown = JSON.parse(content);
    expect(graph).toMatchObject({
      components: [
        {
          type: 'Custom',
          customTypeName: 'BackgroundJob',
          name: 'Order Cleanup',
          schedule: '0 0 * * *',
        },
      ],
    });
  });

  it('stores multiple custom properties when multiple --custom-property flags provided', async () => {
    await createGraphWithCustomType(ctx.testDir, 'orders', 'BackgroundJob', {
      requiredProperties: { schedule: { type: 'string' } },
      optionalProperties: { timeout: { type: 'string' } },
    });

    const program = createProgram();
    await program.parseAsync([
      'node',
      'riviere',
      'builder',
      'add-component',
      '--type',
      'Custom',
      '--custom-type',
      'BackgroundJob',
      '--name',
      'Order Cleanup',
      '--domain',
      'orders',
      '--module',
      'jobs',
      '--repository',
      'https://github.com/org/repo',
      '--file-path',
      'src/jobs/order-cleanup.ts',
      '--custom-property',
      'schedule:0 0 * * *',
      '--custom-property',
      'timeout:5m',
    ]);

    const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
    const content = await readFile(graphPath, 'utf-8');
    const graph: unknown = JSON.parse(content);
    expect(graph).toMatchObject({
      components: [
        {
          schedule: '0 0 * * *',
          timeout: '5m',
        },
      ],
    });
  });

  it('returns VALIDATION_ERROR when --custom-property has invalid format', async () => {
    await createGraphWithCustomType(ctx.testDir, 'orders', 'BackgroundJob', {});

    const program = createProgram();
    await program.parseAsync([
      'node',
      'riviere',
      'builder',
      'add-component',
      '--type',
      'Custom',
      '--custom-type',
      'BackgroundJob',
      '--name',
      'Order Cleanup',
      '--domain',
      'orders',
      '--module',
      'jobs',
      '--repository',
      'https://github.com/org/repo',
      '--file-path',
      'src/jobs/order-cleanup.ts',
      '--custom-property',
      'no-colon-here',
    ]);

    const output = ctx.consoleOutput.join('\n');
    expect(output).toContain(CliErrorCode.ValidationError);
    expect(output).toContain('Invalid custom property format');
  });
});
