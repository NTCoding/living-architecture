import {
  RiviereBuilder, type BuilderOptions 
} from './index'

function createValidOptions(): BuilderOptions {
  return {
    sources: [
      {
        repository: 'test/repo',
        commit: 'abc123',
      },
    ],
    domains: {
      orders: {
        description: 'Order domain',
        systemType: 'domain',
      },
    },
  }
}

function sourceLocation() {
  return {
    repository: 'test/repo',
    filePath: 'src/test.ts',
  }
}

describe('RiviereBuilder upsert', () => {
  it('upsertUI creates then merges and returns created flag', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    const created = builder.upsertUI({
      name: 'Checkout Page',
      domain: 'orders',
      module: 'checkout',
      route: '/checkout',
      description: 'first',
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertUI({
      name: 'Checkout Page',
      domain: 'orders',
      module: 'checkout',
      route: '/checkout-v2',
      description: 'second',
      sourceLocation: sourceLocation(),
    })

    expect(created.created).toBe(true)
    expect(merged.created).toBe(false)
    expect(merged.component.route).toBe('/checkout-v2')
    expect(merged.component.description).toBe('second')
  })

  it('upsertApi creates then merges and returns created flag', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    const created = builder.upsertApi({
      name: 'Create Order',
      domain: 'orders',
      module: 'api',
      apiType: 'REST',
      path: '/orders',
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertApi({
      name: 'Create Order',
      domain: 'orders',
      module: 'api',
      apiType: 'REST',
      path: '/v2/orders',
      sourceLocation: sourceLocation(),
    })

    expect(created.created).toBe(true)
    expect(merged.created).toBe(false)
    expect(merged.component.path).toBe('/v2/orders')
  })

  it('upsertUseCase creates then merges and returns created flag', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    const created = builder.upsertUseCase({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertUseCase({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      description: 'new description',
      sourceLocation: sourceLocation(),
    })

    expect(created.created).toBe(true)
    expect(merged.created).toBe(false)
    expect(merged.component.description).toBe('new description')
  })

  it('upsertDomainOp creates then merges and returns created flag', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    const created = builder.upsertDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'domain',
      operationName: 'placeOrder',
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'domain',
      operationName: 'placeOrderV2',
      sourceLocation: sourceLocation(),
    })

    expect(created.created).toBe(true)
    expect(merged.created).toBe(false)
    expect(merged.component.operationName).toBe('placeOrderV2')
  })

  it('upsertEvent creates then merges and returns created flag', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    const created = builder.upsertEvent({
      name: 'Order Created',
      domain: 'orders',
      module: 'events',
      eventName: 'OrderCreated',
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertEvent({
      name: 'Order Created',
      domain: 'orders',
      module: 'events',
      eventName: 'OrderCreatedV2',
      sourceLocation: sourceLocation(),
    })

    expect(created.created).toBe(true)
    expect(merged.created).toBe(false)
    expect(merged.component.eventName).toBe('OrderCreatedV2')
  })

  it('upsertEventHandler unions subscribed events', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.upsertEventHandler({
      name: 'Notify',
      domain: 'orders',
      module: 'handlers',
      subscribedEvents: ['OrderCreated'],
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertEventHandler({
      name: 'Notify',
      domain: 'orders',
      module: 'handlers',
      subscribedEvents: ['OrderCancelled', 'OrderCreated'],
      sourceLocation: sourceLocation(),
    })

    expect(merged.created).toBe(false)
    expect(merged.component.subscribedEvents).toStrictEqual(['OrderCreated', 'OrderCancelled'])
  })

  it('upsertCustom creates then merges and returns created flag', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    builder.defineCustomType({ name: 'Queue' })

    const created = builder.upsertCustom({
      customTypeName: 'Queue',
      name: 'Outbox Queue',
      domain: 'orders',
      module: 'infra',
      sourceLocation: sourceLocation(),
      metadata: { partition: 2 },
    })

    const merged = builder.upsertCustom({
      customTypeName: 'Queue',
      name: 'Outbox Queue',
      domain: 'orders',
      module: 'infra',
      sourceLocation: sourceLocation(),
      metadata: { partition: 3 },
    })

    expect(created.created).toBe(true)
    expect(merged.created).toBe(false)
    expect(merged.component['partition']).toBe(3)
  })

  it('upsertDomainOp unions arrays and mergeBehavior arrays', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.upsertDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'domain',
      operationName: 'placeOrder',
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
        },
      ],
      businessRules: ['must have items'],
      behavior: {
        reads: ['inventory'],
        emits: ['OrderCreated'],
      },
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'domain',
      operationName: 'placeOrder',
      stateChanges: [
        {
          from: 'placed',
          to: 'confirmed',
        },
        {
          from: 'draft',
          to: 'placed',
        },
      ],
      businessRules: ['must have items', 'must be paid'],
      behavior: {
        reads: ['inventory', 'customer-profile'],
        validates: ['payment'],
        modifies: ['orders'],
      },
      sourceLocation: sourceLocation(),
    })

    expect(merged.component.stateChanges).toStrictEqual([
      {
        from: 'draft',
        to: 'placed',
      },
      {
        from: 'placed',
        to: 'confirmed',
      },
    ])
    expect(merged.component.businessRules).toStrictEqual(['must have items', 'must be paid'])
    expect(merged.component.behavior).toStrictEqual({
      reads: ['inventory', 'customer-profile'],
      emits: ['OrderCreated'],
      validates: ['payment'],
      modifies: ['orders'],
    })
  })

  it('treats empty incoming arrays as no-op', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.upsertEventHandler({
      name: 'Notify',
      domain: 'orders',
      module: 'handlers',
      subscribedEvents: ['OrderCreated'],
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertEventHandler({
      name: 'Notify',
      domain: 'orders',
      module: 'handlers',
      subscribedEvents: [],
      sourceLocation: sourceLocation(),
    })

    expect(merged.component.subscribedEvents).toStrictEqual(['OrderCreated'])
  })

  it('does not overwrite with undefined or null values', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.upsertUI({
      name: 'Checkout Page',
      domain: 'orders',
      module: 'checkout',
      route: '/checkout',
      description: 'first',
      sourceLocation: sourceLocation(),
    })

    const incomingWithUndefinedDescription = {
      name: 'Checkout Page',
      domain: 'orders',
      module: 'checkout',
      route: '/checkout',
      sourceLocation: sourceLocation(),
    }

    Reflect.set(incomingWithUndefinedDescription, 'description', undefined)

    const merged = builder.upsertUI(incomingWithUndefinedDescription)

    const mergedNull = builder.upsertUI(
      JSON.parse(`{
      "name": "Checkout Page",
      "domain": "orders",
      "module": "checkout",
      "route": "/checkout",
      "description": null,
      "sourceLocation": {
        "repository": "test/repo",
        "filePath": "src/test.ts"
      }
    }`),
    )

    expect(merged.component.description).toBe('first')
    expect(mergedNull.component.description).toBe('first')
  })

  it('supports noOverwrite for scalars while still unioning arrays', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.upsertDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'domain',
      operationName: 'placeOrder',
      description: 'deterministic value',
      businessRules: ['must have items'],
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertDomainOp(
      {
        name: 'Place Order',
        domain: 'orders',
        module: 'domain',
        operationName: 'ai-suggested-name',
        description: 'ai value',
        businessRules: ['must be paid'],
        sourceLocation: sourceLocation(),
      },
      { noOverwrite: true },
    )

    expect(merged.component.description).toBe('deterministic value')
    expect(merged.component.operationName).toBe('placeOrder')
    expect(merged.component.businessRules).toStrictEqual(['must have items', 'must be paid'])
  })

  it('fills missing scalar values with noOverwrite', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.upsertApi({
      name: 'Create Order',
      domain: 'orders',
      module: 'api',
      apiType: 'REST',
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertApi(
      {
        name: 'Create Order',
        domain: 'orders',
        module: 'api',
        apiType: 'REST',
        path: '/orders',
        sourceLocation: sourceLocation(),
      },
      { noOverwrite: true },
    )

    expect(merged.component.path).toBe('/orders')
  })

  it('fills missing array values during merge', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.upsertDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'domain',
      operationName: 'placeOrder',
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'domain',
      operationName: 'placeOrder',
      businessRules: ['must have items'],
      sourceLocation: sourceLocation(),
    })

    expect(merged.component.businessRules).toStrictEqual(['must have items'])
  })
})
