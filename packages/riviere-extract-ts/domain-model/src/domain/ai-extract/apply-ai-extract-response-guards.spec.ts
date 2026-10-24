import { describe, expect, it } from 'vitest'
import type {
  AiExtractConfig,
  AiExtractResponse,
} from '@living-architecture/riviere-extract-config-published-language'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { applyAiExtractResponse } from './apply-ai-extract-response'

function builder() {
  return RiviereBuilder.parse({
    name: 'Shop',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
}

function config(overrides: Partial<AiExtractConfig> = {}): AiExtractConfig {
  return {
    command: 'claude',
    args: [],
    timeoutSeconds: 60,
    sources: ['src/**/*.ts'],
    selection: {
      from: ['missing-events'],
      componentTypes: ['Event', 'UseCase', 'DomainOp', 'API', 'UI', 'EventHandler', 'Custom'],
    },
    outputs: { addComponents: true, addLinks: true },
    context: { exclude: [], maxFilesPerBatch: 10, maxBatches: 2 },
    ...overrides,
  }
}

function response(overrides: Partial<AiExtractResponse> = {}): AiExtractResponse {
  return { components: [], links: [], ...overrides }
}

const sourceLocation = { repository: 'ai-repo', filePath: 'src/orders/checkout.ts' }

describe('applyAiExtractResponse guards', () => {
  it('fails when the response writes an undeclared domain', () => {
    const subject = builder()
    const result = applyAiExtractResponse(
      subject,
      response({
        components: [
          {
            type: 'UseCase',
            name: 'PlaceOrder',
            domain: 'billing',
            module: 'ordering',
            sourceLocation,
          },
        ],
      }),
      { repositoryName: 'shop', config: config(), suppressedComponentIds: [] },
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'UNDECLARED_IMPORT_DOMAIN',
      reason: 'AI extract writes undeclared domains: billing',
    })
  })

  it('silently skips suppressed drafts and transitively drops their links', () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-placed',
      sourceLocation: { repository: 'shop', filePath: 'src/orders/order.ts' },
    })
    const result = applyAiExtractResponse(
      subject,
      response({
        components: [
          {
            type: 'UseCase',
            name: 'PlaceOrder',
            domain: 'orders',
            module: 'ordering',
            sourceLocation,
          },
        ],
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:placeorder',
            type: 'async',
            sourceLocation,
          },
          {
            source: 'orders:ordering:usecase:placeorder',
            target: 'orders:ordering:event:orderplaced',
            type: 'sync',
            sourceLocation,
          },
        ],
      }),
      {
        repositoryName: 'shop',
        config: config(),
        suppressedComponentIds: ['orders:ordering:usecase:placeorder'],
      },
    )

    expect(result).toStrictEqual({ success: true, warnings: [] })
    expect(subject.components().some((item) => item.name === 'PlaceOrder')).toBe(false)
    expect(subject.links()).toHaveLength(0)
  })

  it('records a warning when a link collides with an existing occurrence', () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-placed',
      sourceLocation: { repository: 'shop', filePath: 'src/orders/order.ts' },
    })
    subject.upsertUseCase({
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'ordering',
      sourceLocation: { repository: 'shop', filePath: 'src/orders/place.ts' },
    })
    subject.upsertLink({
      from: 'orders:ordering:event:orderplaced',
      to: 'orders:ordering:usecase:placeorder',
      type: 'async',
      sourceLocation: { repository: 'shop', filePath: 'src/orders/order.ts' },
    })

    const result = applyAiExtractResponse(
      subject,
      response({
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:placeorder',
            type: 'async',
            sourceLocation: { repository: 'ai-repo', filePath: 'src/orders/order.ts' },
          },
        ],
      }),
      { repositoryName: 'shop', config: config(), suppressedComponentIds: [] },
    )

    expect(result).toStrictEqual({
      success: true,
      warnings: [
        {
          code: 'AI_CANDIDATE_ALREADY_PRESENT',
          message:
            "AI candidate link already present: 'orders:ordering:event:orderplaced' 'orders:ordering:usecase:placeorder'",
        },
      ],
    })
  })

  it('allows a link to reference a component created in the same response', () => {
    const subject = builder()
    const result = applyAiExtractResponse(
      subject,
      response({
        components: [
          {
            type: 'Event',
            name: 'OrderPlaced',
            domain: 'orders',
            module: 'ordering',
            eventName: 'order-placed',
            sourceLocation,
          },
          {
            type: 'UseCase',
            name: 'PlaceOrder',
            domain: 'orders',
            module: 'ordering',
            sourceLocation,
          },
        ],
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:placeorder',
            type: 'async',
            sourceLocation,
          },
        ],
      }),
      { repositoryName: 'shop', config: config(), suppressedComponentIds: [] },
    )

    expect(result).toStrictEqual({ success: true, warnings: [] })
    expect(subject.links()).toHaveLength(1)
  })

  it('maps every optional domain-op field through to the builder', () => {
    const subject = builder()
    const result = applyAiExtractResponse(
      subject,
      response({
        components: [
          {
            type: 'DomainOp',
            name: 'PlaceOrderOp',
            domain: 'orders',
            module: 'ordering',
            operationName: 'placeOrder',
            entity: 'Order',
            description: 'places an order',
            signature: {
              parameters: [{ name: 'input', type: 'PlaceOrderInput', description: 'the input' }],
              returnType: 'Order',
            },
            behavior: {
              reads: ['Order'],
              validates: ['input'],
              modifies: ['Order'],
              emits: ['OrderPlaced'],
            },
            stateChanges: [{ from: 'draft', to: 'placed', trigger: 'submit' }],
            businessRules: ['must have items'],
            sourceLocation,
          },
        ],
      }),
      { repositoryName: 'shop', config: config(), suppressedComponentIds: [] },
    )

    expect(result).toStrictEqual({ success: true, warnings: [] })
    const component = subject.components().find((item) => item.name === 'PlaceOrderOp')
    expect(component?.type).toBe('DomainOp')
  })

  it('adds api, ui, event handler, and custom drafts', () => {
    const subject = builder()
    const result = applyAiExtractResponse(
      subject,
      response({
        components: [
          {
            type: 'API',
            name: 'PlaceOrderApi',
            domain: 'orders',
            module: 'ordering',
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
            operationName: 'placeOrder',
            sourceLocation,
          },
          {
            type: 'UI',
            name: 'OrderPage',
            domain: 'orders',
            module: 'ordering',
            route: '/orders',
            sourceLocation,
          },
          {
            type: 'EventHandler',
            name: 'HandleOrderPlaced',
            domain: 'orders',
            module: 'ordering',
            subscribedEvents: ['order-placed'],
            sourceLocation,
          },
        ],
      }),
      { repositoryName: 'shop', config: config(), suppressedComponentIds: [] },
    )

    expect(result).toStrictEqual({ success: true, warnings: [] })
    expect(subject.components().map((item) => item.type)).toContain('API')
    expect(subject.components().map((item) => item.type)).toContain('UI')
    expect(subject.components().map((item) => item.type)).toContain('EventHandler')
  })

  it('silently skips suppressed drafts whose domain is undeclared', () => {
    const subject = builder()
    const result = applyAiExtractResponse(
      subject,
      response({
        components: [
          {
            type: 'UseCase',
            name: 'PlaceOrder',
            domain: 'billing',
            module: 'ordering',
            sourceLocation,
          },
        ],
      }),
      {
        repositoryName: 'shop',
        config: config(),
        suppressedComponentIds: ['billing:ordering:usecase:placeorder'],
      },
    )

    expect(result).toStrictEqual({ success: true, warnings: [] })
    expect(subject.components().some((item) => item.name === 'PlaceOrder')).toBe(false)
  })
})
