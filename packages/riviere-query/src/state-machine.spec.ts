import { RiviereQuery } from './RiviereQuery'
import { createMinimalValidGraph, createDomainOpComponent } from './riviere-graph-fixtures'

describe('transitionsFor', () => {
  it('returns empty array for nonexistent entity but transitions for existing entity', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        stateChanges: [{ from: 'Draft', to: 'Placed' }],
      }),
    )
    const query = new RiviereQuery(graph)

    const nonExistent = query.transitionsFor('NonExistent')
    const existing = query.transitionsFor('Order')

    expect(nonExistent).toEqual([])
    expect(existing).toHaveLength(1)
  })

  it('returns transitions with triggeredBy from operations', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        stateChanges: [{ from: 'Draft', to: 'Placed' }],
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.confirm',
        name: 'Order.confirm()',
        domain: 'orders',
        operationName: 'confirm',
        entity: 'Order',
        stateChanges: [{ from: 'Placed', to: 'Confirmed' }],
      }),
    )
    const query = new RiviereQuery(graph)

    const transitions = query.transitionsFor('Order')

    expect(transitions).toEqual([
      { from: 'Draft', to: 'Placed', triggeredBy: 'begin' },
      { from: 'Placed', to: 'Confirmed', triggeredBy: 'confirm' },
    ])
  })

  it('includes wildcard from-state transitions', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.cancel',
        name: 'Order.cancel()',
        domain: 'orders',
        operationName: 'cancel',
        entity: 'Order',
        stateChanges: [{ from: '*', to: 'Cancelled' }],
      }),
    )
    const query = new RiviereQuery(graph)

    const transitions = query.transitionsFor('Order')

    expect(transitions).toEqual([{ from: '*', to: 'Cancelled', triggeredBy: 'cancel' }])
  })

  it('ignores operations without stateChanges', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.query',
        name: 'Order.query()',
        domain: 'orders',
        operationName: 'query',
        entity: 'Order',
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        stateChanges: [{ from: 'Draft', to: 'Placed' }],
      }),
    )
    const query = new RiviereQuery(graph)

    const transitions = query.transitionsFor('Order')

    expect(transitions).toEqual([{ from: 'Draft', to: 'Placed', triggeredBy: 'begin' }])
  })
})

describe('statesFor', () => {
  it('returns empty array for nonexistent entity but states for existing entity', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        stateChanges: [{ from: 'Draft', to: 'Placed' }],
      }),
    )
    const query = new RiviereQuery(graph)

    const nonExistent = query.statesFor('NonExistent')
    const existing = query.statesFor('Order')

    expect(nonExistent).toEqual([])
    expect(existing).toHaveLength(2)
  })

  it('collects states from all operations on entity', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        stateChanges: [{ from: 'Draft', to: 'Placed' }],
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.confirm',
        name: 'Order.confirm()',
        domain: 'orders',
        operationName: 'confirm',
        entity: 'Order',
        stateChanges: [{ from: 'Placed', to: 'Confirmed' }],
      }),
    )
    const query = new RiviereQuery(graph)

    const states = query.statesFor('Order')

    expect(states).toHaveLength(3)
    expect(states).toContain('Draft')
    expect(states).toContain('Placed')
    expect(states).toContain('Confirmed')
  })

  it('orders states by transition flow from initial to terminal', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.confirm',
        name: 'Order.confirm()',
        domain: 'orders',
        operationName: 'confirm',
        entity: 'Order',
        stateChanges: [{ from: 'Placed', to: 'Confirmed' }],
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        stateChanges: [{ from: 'Draft', to: 'Placed' }],
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.ship',
        name: 'Order.ship()',
        domain: 'orders',
        operationName: 'ship',
        entity: 'Order',
        stateChanges: [{ from: 'Confirmed', to: 'Shipped' }],
      }),
    )
    const query = new RiviereQuery(graph)

    const states = query.statesFor('Order')

    expect(states).toEqual(['Draft', 'Placed', 'Confirmed', 'Shipped'])
  })

  it('excludes wildcard from states but includes target states', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        stateChanges: [{ from: 'Draft', to: 'Placed' }],
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.cancel',
        name: 'Order.cancel()',
        domain: 'orders',
        operationName: 'cancel',
        entity: 'Order',
        stateChanges: [{ from: '*', to: 'Cancelled' }],
      }),
    )
    const query = new RiviereQuery(graph)

    const states = query.statesFor('Order')

    expect(states).not.toContain('*')
    expect(states).toContain('Cancelled')
  })

  it('ignores operations without stateChanges when ordering', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.query',
        name: 'Order.query()',
        domain: 'orders',
        operationName: 'query',
        entity: 'Order',
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        stateChanges: [{ from: 'Draft', to: 'Placed' }],
      }),
    )
    const query = new RiviereQuery(graph)

    const states = query.statesFor('Order')

    expect(states).toEqual(['Draft', 'Placed'])
  })

  it('handles cycles in state transitions', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        stateChanges: [{ from: 'Draft', to: 'Active' }],
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.retry',
        name: 'Order.retry()',
        domain: 'orders',
        operationName: 'retry',
        entity: 'Order',
        stateChanges: [{ from: 'Active', to: 'Draft' }],
      }),
    )
    const query = new RiviereQuery(graph)

    const states = query.statesFor('Order')

    expect(states).toHaveLength(2)
    expect(states).toContain('Draft')
    expect(states).toContain('Active')
  })

  it('handles cycles with initial state', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.begin',
        name: 'Order.begin()',
        domain: 'orders',
        operationName: 'begin',
        entity: 'Order',
        stateChanges: [{ from: 'Draft', to: 'Active' }],
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.process',
        name: 'Order.process()',
        domain: 'orders',
        operationName: 'process',
        entity: 'Order',
        stateChanges: [{ from: 'Active', to: 'Processing' }],
      }),
      createDomainOpComponent({
        id: 'orders:checkout:domainop:order.retry',
        name: 'Order.retry()',
        domain: 'orders',
        operationName: 'retry',
        entity: 'Order',
        stateChanges: [{ from: 'Processing', to: 'Active' }],
      }),
    )
    const query = new RiviereQuery(graph)

    const states = query.statesFor('Order')

    expect(states[0]).toBe('Draft')
    expect(states).toContain('Active')
    expect(states).toContain('Processing')
    expect(states).toHaveLength(3)
  })
})
