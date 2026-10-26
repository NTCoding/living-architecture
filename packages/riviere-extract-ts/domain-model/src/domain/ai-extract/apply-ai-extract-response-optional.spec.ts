import { describe, expect, it } from 'vitest'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { applyAiExtractResponse } from './apply-ai-extract-response'
import type {
  ResolvedAiExtractResponse,
  ResolvedComponentDraft,
} from './validate-ai-extract-response'

const sourceLocation = { repository: 'shop', filePath: '/repo/src/orders/checkout.ts' }

function builder(): RiviereBuilder {
  return RiviereBuilder.parse({
    name: 'Shop',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
}

function response(components: readonly ResolvedComponentDraft[]): ResolvedAiExtractResponse {
  return { components, links: [] }
}

function apply(subject: RiviereBuilder, components: readonly ResolvedComponentDraft[]) {
  return applyAiExtractResponse(subject, response(components), {
    repositoryName: 'shop',
    unresolvedDiagnostics: [],
  })
}

describe('applyAiExtractResponse optional fields', () => {
  it('applies the optional API fields when the draft declares them', () => {
    const subject = builder()
    apply(subject, [
      {
        type: 'API',
        name: 'PlaceOrder',
        domain: 'orders',
        module: 'ordering',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders',
        operationName: 'placeOrder',
        sourceLocation,
      },
    ])

    expect(subject.components()[0]).toMatchObject({
      httpMethod: 'POST',
      path: '/orders',
      operationName: 'placeOrder',
    })
  })

  it('omits the optional API fields when the draft omits them', () => {
    const subject = builder()
    apply(subject, [
      {
        type: 'API',
        name: 'PlaceOrder',
        domain: 'orders',
        module: 'ordering',
        apiType: 'REST',
        sourceLocation,
      },
    ])

    expect(Object.keys(subject.components()[0] ?? {})).toStrictEqual(
      expect.not.arrayContaining(['httpMethod', 'path', 'operationName']),
    )
  })

  it('applies the optional description and event schema when declared', () => {
    const subject = builder()
    apply(subject, [
      {
        type: 'Event',
        name: 'OrderPlaced',
        domain: 'orders',
        module: 'ordering',
        description: 'Raised when an order is placed',
        eventName: 'order-placed',
        eventSchema: '{"orderId":"string"}',
        sourceLocation,
      },
    ])

    expect(subject.components()[0]).toMatchObject({
      description: 'Raised when an order is placed',
      eventSchema: '{"orderId":"string"}',
    })
  })

  it('omits the optional description when the draft omits it', () => {
    const subject = builder()
    apply(subject, [
      {
        type: 'UseCase',
        name: 'PlaceOrder',
        domain: 'orders',
        module: 'ordering',
        sourceLocation,
      },
    ])

    expect(Object.keys(subject.components()[0] ?? {})).toStrictEqual(
      expect.not.arrayContaining(['description']),
    )
  })

  it('applies the optional domain operation fields when declared', () => {
    const subject = builder()
    apply(subject, [
      {
        type: 'DomainOp',
        name: 'PlaceOrder',
        domain: 'orders',
        module: 'ordering',
        operationName: 'place-order',
        entity: 'Order',
        signature: { parameters: [{ name: 'orderId', type: 'string' }], returnType: 'Order' },
        behavior: { reads: ['Order'], emits: ['order-placed'] },
        stateChanges: [{ from: 'draft', to: 'placed' }],
        businessRules: ['An order must have at least one line item'],
        sourceLocation,
      },
    ])

    expect(subject.components()[0]).toMatchObject({
      entity: 'Order',
      businessRules: ['An order must have at least one line item'],
      stateChanges: [{ from: 'draft', to: 'placed' }],
    })
  })

  it('omits domain operation fields the draft leaves out', () => {
    const subject = builder()
    apply(subject, [
      {
        type: 'DomainOp',
        name: 'PlaceOrder',
        domain: 'orders',
        module: 'ordering',
        operationName: 'place-order',
        signature: { returnType: 'Order' },
        behavior: { validates: ['Order'] },
        stateChanges: [{ from: 'draft', to: 'placed', trigger: 'place-order' }],
        sourceLocation,
      },
    ])

    expect(subject.components()[0]).toMatchObject({
      signature: { returnType: 'Order' },
      behavior: { validates: ['Order'] },
      stateChanges: [{ from: 'draft', to: 'placed', trigger: 'place-order' }],
    })
  })

  it('keeps parameter descriptions and omits an absent return type', () => {
    const subject = builder()
    apply(subject, [
      {
        type: 'DomainOp',
        name: 'PlaceOrder',
        domain: 'orders',
        module: 'ordering',
        operationName: 'place-order',
        signature: {
          parameters: [{ name: 'orderId', type: 'string', description: 'Identifier' }],
        },
        sourceLocation,
      },
    ])

    expect(subject.components()[0]).toMatchObject({
      signature: { parameters: [{ name: 'orderId', type: 'string', description: 'Identifier' }] },
    })
  })
  it('applies declared domain operation behaviour writes', () => {
    const subject = builder()

    const result = apply(subject, [
      {
        type: 'DomainOp',
        name: 'CancelOrder',
        domain: 'orders',
        module: 'ordering',
        description: 'Cancels an order',
        sourceLocation,
        operationName: 'cancel',
        behavior: { modifies: ['orders.order', 'orders.order-line'] },
      },
    ])

    expect(result.warnings).toStrictEqual([])
    expect(subject.components()).toContainEqual(
      expect.objectContaining({
        id: 'orders:ordering:domainop:cancelorder',
        behavior: { modifies: ['orders.order', 'orders.order-line'] },
      }),
    )
  })
})
