import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createProgram } from '../../cli';
import { CliErrorCode } from '../../error-codes';
import { getErrorMessage } from './add-component';
import { type TestContext, createTestContext, setupCommandTest, createGraphWithDomain } from '../../command-test-fixtures';

describe('riviere builder add-component', () => {
  describe('command registration', () => {
    it('registers add-component command under builder', () => {
      const program = createProgram();
      const builderCmd = program.commands.find((cmd) => cmd.name() === 'builder');
      const addComponentCmd = builderCmd?.commands.find((cmd) => cmd.name() === 'add-component');

      expect(addComponentCmd?.name()).toBe('add-component');
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
        'add-component',
        '--type',
        'UI',
        '--name',
        'Test Component',
        '--domain',
        'orders',
        '--module',
        'checkout',
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        'src/test.ts',
        '--route',
        '/test',
      ]);

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.GraphNotFound);
    });

    it('returns VALIDATION_ERROR when --type is invalid', async () => {
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-component',
        '--type',
        'InvalidType',
        '--name',
        'Test Component',
        '--domain',
        'orders',
        '--module',
        'checkout',
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        'src/test.ts',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
          message: 'Invalid component type: InvalidType',
        },
      });
    });
  });

  describe('adding components', () => {
    const ctx: TestContext = createTestContext();
    setupCommandTest(ctx);

    it('returns DOMAIN_NOT_FOUND when domain does not exist', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-component',
        '--type',
        'UI',
        '--name',
        'Test',
        '--domain',
        'nonexistent',
        '--module',
        'checkout',
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        'src/test.ts',
        '--route',
        '/test',
      ]);
      expect(ctx.consoleOutput.join('\n')).toContain(CliErrorCode.DomainNotFound);
    });

    it.each([
      { type: 'UI', expectedFlag: '--route' },
      { type: 'API', expectedFlag: '--api-type' },
      { type: 'DomainOp', expectedFlag: '--operation-name' },
      { type: 'Event', expectedFlag: '--event-name' },
      { type: 'EventHandler', expectedFlag: '--subscribed-events' },
      { type: 'Custom', expectedFlag: '--custom-type' },
    ])('returns VALIDATION_ERROR when $type missing $expectedFlag', async ({ type, expectedFlag }) => {
      await createGraphWithDomain(ctx.testDir, 'orders');
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-component',
        '--type',
        type,
        '--name',
        'Test',
        '--domain',
        'orders',
        '--module',
        'checkout',
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        'src/test.ts',
      ]);
      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.ValidationError);
      expect(output).toContain(expectedFlag);
    });

    it.each([
      { type: 'UI', name: 'Checkout Page', module: 'checkout', filePath: 'src/pages/checkout.tsx',
        extraArgs: ['--route', '/checkout'], expectedId: 'orders:checkout:ui:checkout-page',
        expectedFields: { type: 'UI', route: '/checkout' } },
      { type: 'API', name: 'Create Order', module: 'api', filePath: 'src/api/orders.ts',
        extraArgs: ['--api-type', 'REST', '--http-method', 'POST', '--http-path', '/api/orders'],
        expectedId: 'orders:api:api:create-order',
        expectedFields: { type: 'API', apiType: 'REST', httpMethod: 'POST', path: '/api/orders' } },
      { type: 'API', name: 'List Orders', module: 'api', filePath: 'src/api/orders.ts',
        extraArgs: ['--api-type', 'REST'], expectedId: 'orders:api:api:list-orders',
        expectedFields: { type: 'API', apiType: 'REST' } },
      { type: 'UseCase', name: 'Place Order', module: 'core', filePath: 'src/usecases/place-order.ts',
        extraArgs: [], expectedId: 'orders:core:usecase:place-order',
        expectedFields: { type: 'UseCase' } },
      { type: 'DomainOp', name: 'Order Create', module: 'domain', filePath: 'src/domain/order.ts',
        extraArgs: ['--operation-name', 'create', '--entity', 'Order'],
        expectedId: 'orders:domain:domainop:order-create',
        expectedFields: { type: 'DomainOp', operationName: 'create', entity: 'Order' } },
      { type: 'DomainOp', name: 'Order Archive', module: 'domain', filePath: 'src/domain/order.ts',
        extraArgs: ['--operation-name', 'archive'], expectedId: 'orders:domain:domainop:order-archive',
        expectedFields: { type: 'DomainOp', operationName: 'archive' } },
      { type: 'Event', name: 'Order Placed', module: 'events', filePath: 'src/events/order-placed.ts',
        extraArgs: ['--event-name', 'OrderPlaced'], expectedId: 'orders:events:event:order-placed',
        expectedFields: { type: 'Event', eventName: 'OrderPlaced' } },
      { type: 'Event', name: 'Payment Received', module: 'events', filePath: 'src/events/payment-received.ts',
        extraArgs: ['--event-name', 'PaymentReceived', '--event-schema', '{ orderId: string }'],
        expectedId: 'orders:events:event:payment-received',
        expectedFields: { type: 'Event', eventName: 'PaymentReceived', eventSchema: '{ orderId: string }' } },
      { type: 'EventHandler', name: 'Send Confirmation', module: 'handlers',
        filePath: 'src/handlers/send-confirmation.ts',
        extraArgs: ['--subscribed-events', 'OrderPlaced,PaymentReceived'],
        expectedId: 'orders:handlers:eventhandler:send-confirmation',
        expectedFields: { type: 'EventHandler', subscribedEvents: ['OrderPlaced', 'PaymentReceived'] } },
    ])('creates $type component', async ({ type, name, module, filePath, extraArgs, expectedId, expectedFields }) => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-component',
        '--type',
        type,
        '--name',
        name,
        '--domain',
        'orders',
        '--module',
        module,
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        filePath,
        ...extraArgs,
      ]);

      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);

      expect(graph).toMatchObject({ components: [{ id: expectedId, ...expectedFields }] });
    });

    it('returns CUSTOM_TYPE_NOT_FOUND when custom type not defined', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-component',
        '--type',
        'Custom',
        '--name',
        'Order Queue',
        '--domain',
        'orders',
        '--module',
        'messaging',
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        'src/queues/orders.ts',
        '--custom-type',
        'MessageQueue',
      ]);

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.CustomTypeNotFound);
    });

    it('returns DUPLICATE_COMPONENT when component already exists', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const args = [
        'node',
        'riviere',
        'builder',
        'add-component',
        '--type',
        'UI',
        '--name',
        'Checkout Page',
        '--domain',
        'orders',
        '--module',
        'checkout',
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        'src/pages/checkout.tsx',
        '--route',
        '/checkout',
      ];

      const program1 = createProgram();
      await program1.parseAsync(args);

      const program2 = createProgram();
      await program2.parseAsync(args);

      const output = ctx.consoleOutput.join('\n');
      expect(output).toContain(CliErrorCode.DuplicateComponent);
    });

    it('outputs success JSON with component ID when --json flag provided', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-component',
        '--type',
        'UI',
        '--name',
        'Checkout Page',
        '--domain',
        'orders',
        '--module',
        'checkout',
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        'src/pages/checkout.tsx',
        '--route',
        '/checkout',
        '--json',
      ]);

      expect(ctx.consoleOutput).toHaveLength(1);
      const output: unknown = JSON.parse(ctx.consoleOutput[0] ?? '');
      expect(output).toMatchObject({
        success: true,
        data: { componentId: 'orders:checkout:ui:checkout-page' },
      });
    });

    it('includes description when --description provided', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-component',
        '--type',
        'UI',
        '--name',
        'Checkout',
        '--domain',
        'orders',
        '--module',
        'web',
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        'src/checkout.tsx',
        '--route',
        '/checkout',
        '--description',
        'Main checkout page',
      ]);
      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({
        components: [{ description: 'Main checkout page' }],
      });
    });

    it('includes lineNumber in sourceLocation when --line-number provided', async () => {
      await createGraphWithDomain(ctx.testDir, 'orders');
      const program = createProgram();
      await program.parseAsync([
        'node',
        'riviere',
        'builder',
        'add-component',
        '--type',
        'UI',
        '--name',
        'Checkout',
        '--domain',
        'orders',
        '--module',
        'web',
        '--repository',
        'https://github.com/org/repo',
        '--file-path',
        'src/checkout.tsx',
        '--route',
        '/checkout',
        '--line-number',
        '42',
      ]);
      const graphPath = join(ctx.testDir, '.riviere', 'graph.json');
      const content = await readFile(graphPath, 'utf-8');
      const graph: unknown = JSON.parse(content);
      expect(graph).toMatchObject({
        components: [{ sourceLocation: { lineNumber: 42 } }],
      });
    });

  });

  describe('getErrorMessage', () => {
    it('returns message from Error instance', () => expect(getErrorMessage(new Error('test error'))).toBe('test error'));
    it('returns Unknown error when input is string', () => expect(getErrorMessage('string error')).toBe('Unknown error'));
    it('returns Unknown error when input is null', () => expect(getErrorMessage(null)).toBe('Unknown error'));
    it('returns Unknown error when input is undefined', () => expect(getErrorMessage(undefined)).toBe('Unknown error'));
    it('returns Unknown error when input is number', () => expect(getErrorMessage(42)).toBe('Unknown error'));
  });
});
