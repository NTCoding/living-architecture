import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  RiviereBuilder, type BuilderOptions 
} from './builder'

function parseGraph(builder: RiviereBuilder): RiviereGraph {
  const graph: RiviereGraph = JSON.parse(builder.serialize())
  return graph
}

function findComponent(builder: RiviereBuilder, id: string) {
  return parseGraph(builder).components.find((c) => c.id === id)
}

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

function createSourceLocation() {
  return {
    repository: 'test/repo',
    filePath: 'src/test.ts',
  }
}

describe('RiviereBuilder enrichComponent duplicate rejection', () => {
  it('skips duplicate stateChange when enriching with same from:to', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    const domainOp = builder.addDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      operationName: 'placeOrder',
      sourceLocation: createSourceLocation(),
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
        },
      ],
    })

    builder.enrichComponent(domainOp.id, {
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
        },
      ],
    })

    const enriched = findComponent(builder, domainOp.id)
    expect(enriched).toMatchObject({
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
        },
      ],
    })
  })

  it('skips duplicate stateChange including trigger field', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    const domainOp = builder.addDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      operationName: 'placeOrder',
      sourceLocation: createSourceLocation(),
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
          trigger: 'submit',
        },
      ],
    })

    builder.enrichComponent(domainOp.id, {
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
          trigger: 'submit',
        },
      ],
    })

    const enriched = findComponent(builder, domainOp.id)
    expect(enriched).toMatchObject({
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
          trigger: 'submit',
        },
      ],
    })
  })

  it('adds stateChange when trigger differs', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    const domainOp = builder.addDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      operationName: 'placeOrder',
      sourceLocation: createSourceLocation(),
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
        },
      ],
    })

    builder.enrichComponent(domainOp.id, {
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
          trigger: 'submit',
        },
      ],
    })

    const enriched = findComponent(builder, domainOp.id)
    expect(enriched).toMatchObject({
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
        },
        {
          from: 'draft',
          to: 'placed',
          trigger: 'submit',
        },
      ],
    })
  })

  it('skips duplicate businessRule', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    const domainOp = builder.addDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      operationName: 'placeOrder',
      sourceLocation: createSourceLocation(),
      businessRules: ['Order must have items'],
    })

    builder.enrichComponent(domainOp.id, { businessRules: ['Order must have items'] })

    const enriched = findComponent(builder, domainOp.id)
    expect(enriched).toMatchObject({ businessRules: ['Order must have items'] })
  })

  it('skips duplicate behavior.reads', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    const domainOp = builder.addDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      operationName: 'placeOrder',
      sourceLocation: createSourceLocation(),
      behavior: { reads: ['this.state'] },
    })

    builder.enrichComponent(domainOp.id, { behavior: { reads: ['this.state'] } })

    const enriched = findComponent(builder, domainOp.id)
    expect(enriched).toMatchObject({ behavior: { reads: ['this.state'] } })
  })

  it('skips duplicate behavior.validates', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    const domainOp = builder.addDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      operationName: 'placeOrder',
      sourceLocation: createSourceLocation(),
      behavior: { validates: ['items.length > 0'] },
    })

    builder.enrichComponent(domainOp.id, { behavior: { validates: ['items.length > 0'] } })

    const enriched = findComponent(builder, domainOp.id)
    expect(enriched).toMatchObject({ behavior: { validates: ['items.length > 0'] } })
  })

  it('skips duplicate behavior.modifies', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    const domainOp = builder.addDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      operationName: 'placeOrder',
      sourceLocation: createSourceLocation(),
      behavior: { modifies: ['this.state'] },
    })

    builder.enrichComponent(domainOp.id, { behavior: { modifies: ['this.state'] } })

    const enriched = findComponent(builder, domainOp.id)
    expect(enriched).toMatchObject({ behavior: { modifies: ['this.state'] } })
  })

  it('skips duplicate behavior.emits', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    const domainOp = builder.addDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      operationName: 'placeOrder',
      sourceLocation: createSourceLocation(),
      behavior: { emits: ['OrderPlaced'] },
    })

    builder.enrichComponent(domainOp.id, { behavior: { emits: ['OrderPlaced'] } })

    const enriched = findComponent(builder, domainOp.id)
    expect(enriched).toMatchObject({ behavior: { emits: ['OrderPlaced'] } })
  })

  it('adds only new values when mix of existing and new provided', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    const domainOp = builder.addDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      operationName: 'placeOrder',
      sourceLocation: createSourceLocation(),
      businessRules: ['Rule A', 'Rule B'],
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
        },
      ],
      behavior: {
        reads: ['this.state'],
        emits: ['OrderPlaced'],
      },
    })

    builder.enrichComponent(domainOp.id, {
      businessRules: ['Rule B', 'Rule C'],
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
        },
        {
          from: 'placed',
          to: 'shipped',
        },
      ],
      behavior: {
        reads: ['this.state', 'items'],
        emits: ['OrderShipped'],
      },
    })

    const enriched = findComponent(builder, domainOp.id)
    expect(enriched).toMatchObject({
      businessRules: ['Rule A', 'Rule B', 'Rule C'],
      stateChanges: [
        {
          from: 'draft',
          to: 'placed',
        },
        {
          from: 'placed',
          to: 'shipped',
        },
      ],
      behavior: {
        reads: ['this.state', 'items'],
        emits: ['OrderPlaced', 'OrderShipped'],
      },
    })
  })
})
