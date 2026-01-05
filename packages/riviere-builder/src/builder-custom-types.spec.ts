import {
  RiviereBuilder, type BuilderOptions 
} from './builder';

function createValidOptions(): BuilderOptions {
  return {
    sources: [{
      repository: 'my-org/my-repo',
      commit: 'abc123' 
    }],
    domains: {
      orders: {
        description: 'Order management',
        systemType: 'domain' 
      },
    },
  };
}

describe('RiviereBuilder custom types', () => {
  describe('defineCustomType', () => {
    it('registers custom type with required properties', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      builder.defineCustomType({
        name: 'MessageQueue',
        requiredProperties: {
          queueName: {
            type: 'string',
            description: 'Queue identifier' 
          },
        },
      });

      expect(builder.graph.metadata.customTypes).toEqual({
        MessageQueue: {
          requiredProperties: {
            queueName: {
              type: 'string',
              description: 'Queue identifier' 
            },
          },
        },
      });
    });

    it('registers custom type with optional properties and description', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      builder.defineCustomType({
        name: 'CacheStore',
        description: 'In-memory cache',
        optionalProperties: {
          ttl: {
            type: 'number',
            description: 'Time to live in seconds' 
          },
        },
      });

      expect(builder.graph.metadata.customTypes).toEqual({
        CacheStore: {
          description: 'In-memory cache',
          optionalProperties: {
            ttl: {
              type: 'number',
              description: 'Time to live in seconds' 
            },
          },
        },
      });
    });

    it('throws when custom type name already defined', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      builder.defineCustomType({ name: 'MessageQueue' });

      expect(() => builder.defineCustomType({ name: 'MessageQueue' })).toThrow(
        "Custom type 'MessageQueue' already defined",
      );
    });
  });

  describe('addCustom', () => {
    it('returns CustomComponent when type is defined', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      builder.defineCustomType({ name: 'MessageQueue' });

      const component = builder.addCustom({
        customTypeName: 'MessageQueue',
        name: 'Order Queue',
        domain: 'orders',
        module: 'messaging',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/queues/order-queue.ts',
        },
      });

      expect(component).toEqual({
        id: 'orders:messaging:custom:order-queue',
        type: 'Custom',
        customTypeName: 'MessageQueue',
        name: 'Order Queue',
        domain: 'orders',
        module: 'messaging',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/queues/order-queue.ts',
        },
      });
    });

    it('includes description when provided', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      builder.defineCustomType({ name: 'MessageQueue' });

      const component = builder.addCustom({
        customTypeName: 'MessageQueue',
        name: 'Order Queue',
        domain: 'orders',
        module: 'messaging',
        description: 'Queue for order events',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/queues/order-queue.ts',
        },
      });

      expect(component.description).toBe('Queue for order events');
    });

    it('throws immediately when custom type is not defined', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      builder.defineCustomType({ name: 'MessageQueue' });
      builder.defineCustomType({ name: 'CacheStore' });

      expect(() =>
        builder.addCustom({
          customTypeName: 'UndefinedType',
          name: 'Some Component',
          domain: 'orders',
          module: 'messaging',
          sourceLocation: {
            repository: 'my-org/my-repo',
            filePath: 'src/some.ts',
          },
        }),
      ).toThrow(
        "Custom type 'UndefinedType' not defined. Defined types: MessageQueue, CacheStore",
      );
    });

    it('throws with explicit message when no custom types registered', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      expect(() =>
        builder.addCustom({
          customTypeName: 'UndefinedType',
          name: 'Some Component',
          domain: 'orders',
          module: 'messaging',
          sourceLocation: {
            repository: 'my-org/my-repo',
            filePath: 'src/some.ts',
          },
        }),
      ).toThrow(
        "Custom type 'UndefinedType' not defined. No custom types have been defined.",
      );
    });

    it('throws immediately when required properties are missing', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      builder.defineCustomType({
        name: 'MessageQueue',
        requiredProperties: {
          queueName: { type: 'string' },
          messageType: { type: 'string' },
        },
      });

      expect(() =>
        builder.addCustom({
          customTypeName: 'MessageQueue',
          name: 'Order Queue',
          domain: 'orders',
          module: 'messaging',
          sourceLocation: {
            repository: 'my-org/my-repo',
            filePath: 'src/queues.ts',
          },
        }),
      ).toThrow(
        "Missing required properties for 'MessageQueue': queueName, messageType",
      );
    });
  });
});
