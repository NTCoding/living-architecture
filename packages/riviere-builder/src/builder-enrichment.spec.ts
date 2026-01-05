import {
  RiviereBuilder, type BuilderOptions 
} from './builder';

function createValidOptions(): BuilderOptions {
  return {
    sources: [{
      repository: 'test/repo',
      commit: 'abc123' 
    }],
    domains: {
      orders: {
        description: 'Order domain',
        systemType: 'domain' 
      },
    },
  };
}

function createSourceLocation() {
  return {
    repository: 'test/repo',
    filePath: 'src/test.ts' 
  };
}

describe('RiviereBuilder enrichComponent', () => {
  describe('stateChanges', () => {
    it('adds stateChanges to DomainOp component', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const domainOp = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
      });

      builder.enrichComponent(domainOp.id, {
        stateChanges: [{
          from: 'draft',
          to: 'placed' 
        }],
      });

      const enriched = builder.graph.components.find(
        (c) => c.id === domainOp.id,
      );
      expect(enriched).toMatchObject({
        stateChanges: [{
          from: 'draft',
          to: 'placed' 
        }],
      });
    });
  });

  describe('businessRules', () => {
    it('adds businessRules to DomainOp component', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const domainOp = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
      });

      builder.enrichComponent(domainOp.id, {
        businessRules: [
          'Customer must have valid payment',
          'Inventory must be available',
        ],
      });

      const enriched = builder.graph.components.find(
        (c) => c.id === domainOp.id,
      );
      expect(enriched).toMatchObject({
        businessRules: [
          'Customer must have valid payment',
          'Inventory must be available',
        ],
      });
    });
  });

  describe('entity', () => {
    it('sets entity on DomainOp component', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const domainOp = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
      });

      builder.enrichComponent(domainOp.id, { entity: 'Order' });

      const enriched = builder.graph.components.find(
        (c) => c.id === domainOp.id,
      );
      expect(enriched).toMatchObject({ entity: 'Order' });
    });
  });

  describe('validation', () => {
    it('throws when component is not DomainOp', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const useCase = builder.addUseCase({
        name: 'Checkout Flow',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      });

      expect(() =>
        builder.enrichComponent(useCase.id, {
          stateChanges: [{
            from: 'draft',
            to: 'placed' 
          }],
        }),
      ).toThrow(
        "Only DomainOp components can be enriched. 'orders:checkout:usecase:checkout-flow' is type 'UseCase'",
      );
    });

    it('suggests near-matches for missing component', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
      });

      expect(() =>
        builder.enrichComponent('orders:checkout:domainop:place-ordr', {entity: 'Order',}),
      ).toThrow(
        /not found.*Did you mean.*orders:checkout:domainop:place-order/i,
      );
    });

    it('accepts empty businessRules array', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const domainOp = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
      });

      builder.enrichComponent(domainOp.id, { businessRules: [] });

      const enriched = builder.graph.components.find(
        (c) => c.id === domainOp.id,
      );
      expect(enriched).toMatchObject({ businessRules: [] });
    });
  });

  describe('behavior', () => {
    it('adds behavior.reads to DomainOp component', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const domainOp = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
      });

      builder.enrichComponent(domainOp.id, {behavior: { reads: ['items parameter', 'this.state'] },});

      const enriched = builder.graph.components.find(
        (c) => c.id === domainOp.id,
      );
      expect(enriched).toMatchObject({behavior: { reads: ['items parameter', 'this.state'] },});
    });

    it('adds complete behavior object to DomainOp component', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const domainOp = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
      });

      builder.enrichComponent(domainOp.id, {
        behavior: {
          reads: ['items parameter'],
          validates: ['items.length > 0'],
          modifies: ['this.state ← Placed'],
          emits: ['order-placed event'],
        },
      });

      const enriched = builder.graph.components.find(
        (c) => c.id === domainOp.id,
      );
      expect(enriched).toMatchObject({
        behavior: {
          reads: ['items parameter'],
          validates: ['items.length > 0'],
          modifies: ['this.state ← Placed'],
          emits: ['order-placed event'],
        },
      });
    });

    it('appends to existing behavior.reads', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const domainOp = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
        behavior: { reads: ['this.state'] },
      });

      builder.enrichComponent(domainOp.id, {behavior: { reads: ['items parameter'] },});

      const enriched = builder.graph.components.find(
        (c) => c.id === domainOp.id,
      );
      expect(enriched).toMatchObject({behavior: { reads: ['this.state', 'items parameter'] },});
    });
  });

  describe('append behavior', () => {
    it('appends to existing stateChanges', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const domainOp = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
        stateChanges: [{
          from: 'draft',
          to: 'placed' 
        }],
      });

      builder.enrichComponent(domainOp.id, {
        stateChanges: [{
          from: 'placed',
          to: 'shipped' 
        }],
      });

      const enriched = builder.graph.components.find(
        (c) => c.id === domainOp.id,
      );
      expect(enriched).toMatchObject({
        stateChanges: [
          {
            from: 'draft',
            to: 'placed' 
          },
          {
            from: 'placed',
            to: 'shipped' 
          },
        ],
      });
    });

    it('appends to existing businessRules', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const domainOp = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
        businessRules: ['Customer must be authenticated'],
      });

      builder.enrichComponent(domainOp.id, {businessRules: ['Inventory must be available'],});

      const enriched = builder.graph.components.find(
        (c) => c.id === domainOp.id,
      );
      expect(enriched).toMatchObject({
        businessRules: [
          'Customer must be authenticated',
          'Inventory must be available',
        ],
      });
    });
  });

  describe('signature', () => {
    it('sets signature on DomainOp component', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const domainOp = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
      });

      builder.enrichComponent(domainOp.id, {
        signature: {
          parameters: [{
            name: 'orderId',
            type: 'string' 
          }],
          returnType: 'Order',
        },
      });

      const enriched = builder.graph.components.find(
        (c) => c.id === domainOp.id,
      );
      expect(enriched).toMatchObject({
        signature: {
          parameters: [{
            name: 'orderId',
            type: 'string' 
          }],
          returnType: 'Order',
        },
      });
    });

    it('replaces existing signature on DomainOp component', () => {
      const builder = RiviereBuilder.new(createValidOptions());
      const domainOp = builder.addDomainOp({
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'placeOrder',
        sourceLocation: createSourceLocation(),
        signature: { returnType: 'void' },
      });

      builder.enrichComponent(domainOp.id, {
        signature: {
          parameters: [{
            name: 'orderId',
            type: 'string' 
          }],
          returnType: 'Order',
        },
      });

      const enriched = builder.graph.components.find(
        (c) => c.id === domainOp.id,
      );
      expect(enriched).toMatchObject({
        signature: {
          parameters: [{
            name: 'orderId',
            type: 'string' 
          }],
          returnType: 'Order',
        },
      });
    });
  });
});
