import {
  describe, it, expect, vi 
} from 'vitest';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import type { TestContext } from '../../command-test-fixtures';
import {
  createTestContext, setupCommandTest, createGraph 
} from '../../command-test-fixtures';

describe('riviere query components - error handling', () => {
  const ctx: TestContext = createTestContext();
  setupCommandTest(ctx);

  it('returns GRAPH_NOT_FOUND when no graph exists', async () => {
    await createProgram().parseAsync(['node', 'riviere', 'query', 'components', '--json']);
    expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.GraphNotFound);
  });

  it('returns VALIDATION_ERROR when --type value is invalid', async () => {
    await createGraph(ctx.testDir, {
      version: '1.0',
      metadata: {
        sources: [{ repository: 'https://github.com/org/repo' }],
        domains: {
          orders: {
            description: 'Order management',
            systemType: 'domain',
          },
        },
      },
      components: [],
      links: [],
    });

    await createProgram().parseAsync([
      'node',
      'riviere',
      'query',
      'components',
      '--type',
      'InvalidType',
      '--json',
    ]);
    expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.ValidationError);
  });

  it('outputs error to stderr when --type is invalid and --json not provided', async () => {
    await createGraph(ctx.testDir, {
      version: '1.0',
      metadata: {
        sources: [{ repository: 'https://github.com/org/repo' }],
        domains: {
          orders: {
            description: 'Order management',
            systemType: 'domain',
          },
        },
      },
      components: [],
      links: [],
    });

    const errorOutput: string[] = [];
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation((msg: string) => errorOutput.push(msg));

    await createProgram().parseAsync([
      'node',
      'riviere',
      'query',
      'components',
      '--type',
      'InvalidType',
    ]);

    expect(errorOutput).toHaveLength(1);
    expect(errorOutput[0]).toContain('Invalid component type: InvalidType');
    errorSpy.mockRestore();
  });
});
