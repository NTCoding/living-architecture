import { RiviereQuery } from './RiviereQuery'
import { createMinimalValidGraph, createDomainOpComponent } from './graph-test-builders'

describe('operationsFor', () => {
  it('returns empty array when entity does not exist', () => {
    const graph = createMinimalValidGraph()
    const query = new RiviereQuery(graph)

    const operations = query.operationsFor('NonExistent')

    expect(operations).toEqual([])
  })

  it('returns all DomainOps targeting the entity', () => {
    const graph = createMinimalValidGraph()
    const beginOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.begin',
      name: 'Order.begin()',
      domain: 'orders',
      operationName: 'begin',
      entity: 'Order',
    })
    const shipOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.ship',
      name: 'Order.ship()',
      domain: 'orders',
      operationName: 'ship',
      entity: 'Order',
    })
    graph.components.push(beginOp, shipOp)
    const query = new RiviereQuery(graph)

    const operations = query.operationsFor('Order')

    expect(operations).toEqual([beginOp, shipOp])
  })
})

describe('entities', () => {
  it('returns empty array when no DomainOp components exist', () => {
    const graph = createMinimalValidGraph()
    const query = new RiviereQuery(graph)

    const entities = query.entities()

    expect(entities).toEqual([])
  })

  it('returns entity with its operations when DomainOps target it', () => {
    const graph = createMinimalValidGraph()
    const beginOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.begin',
      name: 'Order.begin()',
      domain: 'orders',
      operationName: 'begin',
      entity: 'Order',
    })
    const shipOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.ship',
      name: 'Order.ship()',
      domain: 'orders',
      operationName: 'ship',
      entity: 'Order',
    })
    graph.components.push(beginOp, shipOp)
    const query = new RiviereQuery(graph)

    const entities = query.entities()

    expect(entities).toEqual([
      {
        name: 'Order',
        domain: 'orders',
        operations: [beginOp, shipOp],
      },
    ])
  })

  it('filters entities by domain when domainName provided', () => {
    const graph = createMinimalValidGraph()
    const orderOp = createDomainOpComponent({
      id: 'orders:checkout:domainop:order.begin',
      name: 'Order.begin()',
      domain: 'orders',
      operationName: 'begin',
      entity: 'Order',
    })
    const paymentOp = createDomainOpComponent({
      id: 'payment:processing:domainop:payment.complete',
      name: 'Payment.complete()',
      domain: 'payment',
      operationName: 'complete',
      entity: 'Payment',
    })
    graph.components.push(orderOp, paymentOp)
    const query = new RiviereQuery(graph)

    const entities = query.entities('orders')

    expect(entities).toEqual([
      {
        name: 'Order',
        domain: 'orders',
        operations: [orderOp],
      },
    ])
  })
})

describe('businessRulesFor', () => {
  it('returns empty array when entity does not exist', () => {
    const graph = createMinimalValidGraph()
    const query = new RiviereQuery(graph)

    const rules = query.businessRulesFor('NonExistent')

    expect(rules).toEqual([])
  })

  it('returns empty array when operations have no businessRules', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
      }),
    )
    const query = new RiviereQuery(graph)

    const rules = query.businessRulesFor('Order')

    expect(rules).toEqual([])
  })

  it('aggregates business rules from all operations on the entity', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        businessRules: ['Order must have at least one item', 'Customer must be verified'],
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.ship',
        name: 'Order.ship()',
        domain: 'orders',
        operationName: 'ship',
        entity: 'Order',
        businessRules: ['Order must be confirmed before shipping'],
      }),
    )
    const query = new RiviereQuery(graph)

    const rules = query.businessRulesFor('Order')

    expect(rules).toEqual([
      'Order must have at least one item',
      'Customer must be verified',
      'Order must be confirmed before shipping',
    ])
  })

  it('deduplicates business rules across operations', () => {
    const graph = createMinimalValidGraph()
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
    )
    const query = new RiviereQuery(graph)

    const rules = query.businessRulesFor('Order')

    expect(rules).toHaveLength(3)
    expect(rules.filter((r) => r === 'Total must be positive')).toHaveLength(1)
  })
})
