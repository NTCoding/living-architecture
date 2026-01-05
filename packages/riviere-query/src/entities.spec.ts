import { RiviereQuery } from './RiviereQuery';
import {
  createMinimalValidGraph,
  createDomainOpComponent,
} from './riviere-graph-fixtures';

describe('operationsFor', () => {
  it('returns empty array when entity does not exist', () => {
    const graph = createMinimalValidGraph();
    const query = new RiviereQuery(graph);

    const operations = query.operationsFor('NonExistent');

    expect(operations).toEqual([]);
  });

  it('returns all DomainOps targeting the entity', () => {
    const graph = createMinimalValidGraph();
    const beginOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.begin',
      name: 'Order.begin()',
      domain: 'orders',
      operationName: 'begin',
      entity: 'Order',
    });
    const shipOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.ship',
      name: 'Order.ship()',
      domain: 'orders',
      operationName: 'ship',
      entity: 'Order',
    });
    graph.components.push(beginOp, shipOp);
    const query = new RiviereQuery(graph);

    const operations = query.operationsFor('Order');

    expect(operations).toEqual([beginOp, shipOp]);
  });
});

describe('entities', () => {
  it('returns empty array when no DomainOp components exist', () => {
    const graph = createMinimalValidGraph();
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities).toEqual([]);
  });

  it('returns entity with its operations when DomainOps target it', () => {
    const graph = createMinimalValidGraph();
    const beginOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.begin',
      name: 'Order.begin()',
      domain: 'orders',
      operationName: 'begin',
      entity: 'Order',
    });
    const shipOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.ship',
      name: 'Order.ship()',
      domain: 'orders',
      operationName: 'ship',
      entity: 'Order',
    });
    graph.components.push(beginOp, shipOp);
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities).toEqual([
      {
        name: 'Order',
        domain: 'orders',
        operations: [beginOp, shipOp],
        states: [],
        transitions: [],
        businessRules: [],
      },
    ]);
  });

  it('filters entities by domain when domainName provided', () => {
    const graph = createMinimalValidGraph();
    const orderOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.begin',
      name: 'Order.begin()',
      domain: 'orders',
      operationName: 'begin',
      entity: 'Order',
    });
    const paymentOp = createDomainOpComponent({
      id: 'payment:processing:domainop:payment.complete',
      name: 'Payment.complete()',
      domain: 'payment',
      operationName: 'complete',
      entity: 'Payment',
    });
    graph.components.push(orderOp, paymentOp);
    const query = new RiviereQuery(graph);

    const entities = query.entities('orders');

    expect(entities).toEqual([
      {
        name: 'Order',
        domain: 'orders',
        operations: [orderOp],
        states: [],
        transitions: [],
        businessRules: [],
      },
    ]);
  });

  it('returns entities sorted alphabetically by name', () => {
    const graph = createMinimalValidGraph();
    const zebraOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:zebra.run',
      name: 'Zebra.run()',
      domain: 'orders',
      operationName: 'run',
      entity: 'Zebra',
    });
    const appleOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:apple.grow',
      name: 'Apple.grow()',
      domain: 'orders',
      operationName: 'grow',
      entity: 'Apple',
    });
    graph.components.push(zebraOp, appleOp);
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities.map((e) => e.name)).toEqual(['Apple', 'Zebra']);
  });

  it('returns entity with states ordered by transition flow', () => {
    const graph = createMinimalValidGraph();
    const beginOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.begin',
      name: 'Order.begin()',
      domain: 'orders',
      operationName: 'begin',
      entity: 'Order',
      stateChanges: [
        {
          from: 'Draft',
          to: 'Placed',
        },
      ],
    });
    const confirmOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.confirm',
      name: 'Order.confirm()',
      domain: 'orders',
      operationName: 'confirm',
      entity: 'Order',
      stateChanges: [
        {
          from: 'Placed',
          to: 'Confirmed',
        },
      ],
    });
    graph.components.push(beginOp, confirmOp);
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities).toHaveLength(1);
    expect(entities[0]?.states).toEqual(['Draft', 'Placed', 'Confirmed']);
  });

  it('returns entity with transitions including triggeredBy operation', () => {
    const graph = createMinimalValidGraph();
    const beginOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.begin',
      name: 'Order.begin()',
      domain: 'orders',
      operationName: 'begin',
      entity: 'Order',
      stateChanges: [
        {
          from: 'Draft',
          to: 'Placed',
        },
      ],
    });
    graph.components.push(beginOp);
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities).toHaveLength(1);
    expect(entities[0]?.transitions).toEqual([
      {
        from: 'Draft',
        to: 'Placed',
        triggeredBy: 'begin',
      },
    ]);
  });

  it('returns entity with deduplicated businessRules from all operations', () => {
    const graph = createMinimalValidGraph();
    const beginOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.begin',
      name: 'Order.begin()',
      domain: 'orders',
      operationName: 'begin',
      entity: 'Order',
      businessRules: ['Total must be positive', 'Customer must be verified'],
    });
    const shipOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.ship',
      name: 'Order.ship()',
      domain: 'orders',
      operationName: 'ship',
      entity: 'Order',
      businessRules: ['Total must be positive', 'Order must be confirmed'],
    });
    graph.components.push(beginOp, shipOp);
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities).toHaveLength(1);
    expect(entities[0]?.businessRules).toEqual([
      'Total must be positive',
      'Customer must be verified',
      'Order must be confirmed',
    ]);
  });
});

describe('Entity methods', () => {
  it('hasStates returns true when entity has states', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        stateChanges: [
          {
            from: 'Draft',
            to: 'Placed',
          },
        ],
      }),
    );
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities).toHaveLength(1);
    expect(entities[0]?.hasStates()).toBe(true);
  });

  it('hasStates returns false when entity has no states', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.validate',
        name: 'Order.validate()',
        domain: 'orders',
        operationName: 'validate',
        entity: 'Order',
      }),
    );
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities).toHaveLength(1);
    expect(entities[0]?.hasStates()).toBe(false);
  });

  it('hasBusinessRules returns true when entity has business rules', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        businessRules: ['Total must be positive'],
      }),
    );
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities).toHaveLength(1);
    expect(entities[0]?.hasBusinessRules()).toBe(true);
  });

  it('hasBusinessRules returns false when entity has no business rules', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.validate',
        name: 'Order.validate()',
        domain: 'orders',
        operationName: 'validate',
        entity: 'Order',
      }),
    );
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities).toHaveLength(1);
    expect(entities[0]?.hasBusinessRules()).toBe(false);
  });

  it('firstOperationId returns first operation id', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.ship',
        name: 'Order.ship()',
        domain: 'orders',
        operationName: 'ship',
        entity: 'Order',
      }),
    );
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities).toHaveLength(1);
    expect(entities[0]?.firstOperationId()).toBe(
      'orders:checkout:domainop:order.begin',
    );
  });

  it('firstOperationId returns undefined when no operations', () => {
    const graph = createMinimalValidGraph();
    const query = new RiviereQuery(graph);

    const entities = query.entities();

    expect(entities).toHaveLength(0);
  });
});

describe('businessRulesFor', () => {
  it('returns empty array when entity does not exist', () => {
    const graph = createMinimalValidGraph();
    const query = new RiviereQuery(graph);

    const rules = query.businessRulesFor('NonExistent');

    expect(rules).toEqual([]);
  });

  it('returns empty array when operations have no businessRules', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
      }),
    );
    const query = new RiviereQuery(graph);

    const rules = query.businessRulesFor('Order');

    expect(rules).toEqual([]);
  });

  it('aggregates business rules from all operations on the entity', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        businessRules: [
          'Order must have at least one item',
          'Customer must be verified',
        ],
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.ship',
        name: 'Order.ship()',
        domain: 'orders',
        operationName: 'ship',
        entity: 'Order',
        businessRules: ['Order must be confirmed before shipping'],
      }),
    );
    const query = new RiviereQuery(graph);

    const rules = query.businessRulesFor('Order');

    expect(rules).toEqual([
      'Order must have at least one item',
      'Customer must be verified',
      'Order must be confirmed before shipping',
    ]);
  });

  it('deduplicates business rules across operations', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        businessRules: ['Total must be positive', 'Customer must be verified'],
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.ship',
        name: 'Order.ship()',
        domain: 'orders',
        operationName: 'ship',
        entity: 'Order',
        businessRules: ['Total must be positive', 'Order must be confirmed'],
      }),
    );
    const query = new RiviereQuery(graph);

    const rules = query.businessRulesFor('Order');

    expect(rules).toHaveLength(3);
    expect(rules.filter((r) => r === 'Total must be positive')).toHaveLength(1);
  });
});
