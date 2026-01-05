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

describe('RiviereBuilder components', () => {
  describe('addUI', () => {
    it('returns UIComponent with generated ID when given valid input', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addUI({
        name: 'Checkout Page',
        domain: 'orders',
        module: 'checkout',
        route: '/checkout',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/pages/checkout.tsx',
        },
      });

      expect(component).toEqual({
        id: 'orders:checkout:ui:checkout-page',
        type: 'UI',
        name: 'Checkout Page',
        domain: 'orders',
        module: 'checkout',
        route: '/checkout',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/pages/checkout.tsx',
        },
      });
    });

    it('includes optional description when provided', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addUI({
        name: 'Checkout Page',
        domain: 'orders',
        module: 'checkout',
        route: '/checkout',
        description: 'Main checkout page',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/pages/checkout.tsx',
        },
      });

      expect(component.description).toBe('Main checkout page');
    });

    it('throws when domain does not exist', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      expect(() =>
        builder.addUI({
          name: 'Checkout Page',
          domain: 'unknown',
          module: 'checkout',
          route: '/checkout',
          sourceLocation: {
            repository: 'my-org/my-repo',
            filePath: 'src/pages/checkout.tsx',
          },
        }),
      ).toThrow("Domain 'unknown' does not exist");
    });

    it('throws when component with same ID already exists', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const input = {
        name: 'Checkout Page',
        domain: 'orders',
        module: 'checkout',
        route: '/checkout',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/pages/checkout.tsx',
        },
      };

      builder.addUI(input);

      expect(() => builder.addUI(input)).toThrow(
        "Component with ID 'orders:checkout:ui:checkout-page' already exists",
      );
    });
  });

  describe('addApi', () => {
    it('returns APIComponent with generated ID for REST endpoint', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addApi({
        name: 'Create Order',
        domain: 'orders',
        module: 'api',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/api/orders.ts',
        },
      });

      expect(component).toEqual({
        id: 'orders:api:api:create-order',
        type: 'API',
        name: 'Create Order',
        domain: 'orders',
        module: 'api',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/api/orders.ts',
        },
      });
    });

    it('returns APIComponent with generated ID for GraphQL operation', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addApi({
        name: 'Create Order Mutation',
        domain: 'orders',
        module: 'graphql',
        apiType: 'GraphQL',
        operationName: 'createOrder',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/graphql/orders.ts',
        },
      });

      expect(component).toEqual({
        id: 'orders:graphql:api:create-order-mutation',
        type: 'API',
        name: 'Create Order Mutation',
        domain: 'orders',
        module: 'graphql',
        apiType: 'GraphQL',
        operationName: 'createOrder',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/graphql/orders.ts',
        },
      });
    });

    it('includes optional description when provided', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addApi({
        name: 'Create Order',
        domain: 'orders',
        module: 'api',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders',
        description: 'Creates a new order',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/api/orders.ts',
        },
      });

      expect(component.description).toBe('Creates a new order');
    });
  });

  describe('addUseCase', () => {
    it('returns UseCaseComponent with generated ID', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addUseCase({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/usecases/place-order.ts',
        },
      });

      expect(component).toEqual({
        id: 'orders:checkout:usecase:place-order',
        type: 'UseCase',
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/usecases/place-order.ts',
        },
      });
    });

    it('includes optional description when provided', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addUseCase({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        description: 'Orchestrates order placement',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/usecases/place-order.ts',
        },
      });

      expect(component.description).toBe('Orchestrates order placement');
    });
  });

  describe('addDomainOp', () => {
    it('returns DomainOpComponent with generated ID', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'domain',
        operationName: 'place',
        entity: 'Order',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/domain/order.ts',
        },
      });

      expect(component).toEqual({
        id: 'orders:domain:domainop:place-order',
        type: 'DomainOp',
        name: 'Place Order',
        domain: 'orders',
        module: 'domain',
        operationName: 'place',
        entity: 'Order',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/domain/order.ts',
        },
      });
    });

    it('includes all optional fields when provided', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'domain',
        operationName: 'place',
        entity: 'Order',
        signature: {
          parameters: [{
            name: 'orderId',
            type: 'string' 
          }],
          returnType: 'Order',
        },
        behavior: {
          reads: ['inventory'],
          modifies: ['orders'] 
        },
        stateChanges: [{
          from: 'draft',
          to: 'placed' 
        }],
        businessRules: ['Order must have items'],
        description: 'Places an order',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/domain/order.ts',
        },
      });

      expect(component.signature).toEqual({
        parameters: [{
          name: 'orderId',
          type: 'string' 
        }],
        returnType: 'Order',
      });
      expect(component.behavior).toEqual({
        reads: ['inventory'],
        modifies: ['orders'],
      });
      expect(component.stateChanges).toEqual([{
        from: 'draft',
        to: 'placed' 
      }]);
      expect(component.businessRules).toEqual(['Order must have items']);
      expect(component.description).toBe('Places an order');
    });
  });

  describe('addEvent', () => {
    it('returns EventComponent with generated ID', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addEvent({
        name: 'Order Placed',
        domain: 'orders',
        module: 'events',
        eventName: 'OrderPlaced',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/events/order-placed.ts',
        },
      });

      expect(component).toEqual({
        id: 'orders:events:event:order-placed',
        type: 'Event',
        name: 'Order Placed',
        domain: 'orders',
        module: 'events',
        eventName: 'OrderPlaced',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/events/order-placed.ts',
        },
      });
    });

    it('includes optional eventSchema when provided', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addEvent({
        name: 'Order Placed',
        domain: 'orders',
        module: 'events',
        eventName: 'OrderPlaced',
        eventSchema: 'OrderPlacedPayload',
        description: 'Emitted when order is placed',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/events/order-placed.ts',
        },
      });

      expect(component.eventSchema).toBe('OrderPlacedPayload');
      expect(component.description).toBe('Emitted when order is placed');
    });
  });

  describe('addEventHandler', () => {
    it('returns EventHandlerComponent with generated ID', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addEventHandler({
        name: 'Send Order Confirmation',
        domain: 'orders',
        module: 'handlers',
        subscribedEvents: ['OrderPlaced'],
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/handlers/send-order-confirmation.ts',
        },
      });

      expect(component).toEqual({
        id: 'orders:handlers:eventhandler:send-order-confirmation',
        type: 'EventHandler',
        name: 'Send Order Confirmation',
        domain: 'orders',
        module: 'handlers',
        subscribedEvents: ['OrderPlaced'],
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/handlers/send-order-confirmation.ts',
        },
      });
    });

    it('includes optional description when provided', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const component = builder.addEventHandler({
        name: 'Send Order Confirmation',
        domain: 'orders',
        module: 'handlers',
        subscribedEvents: ['OrderPlaced'],
        description: 'Sends confirmation email',
        sourceLocation: {
          repository: 'my-org/my-repo',
          filePath: 'src/handlers/send-order-confirmation.ts',
        },
      });

      expect(component.description).toBe('Sends confirmation email');
    });
  });
});
