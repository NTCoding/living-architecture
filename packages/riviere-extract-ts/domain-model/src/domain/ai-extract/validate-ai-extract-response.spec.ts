import { assert, describe, expect, it } from 'vitest'
import type {
  AiExtractConfig,
  AiExtractResponse,
} from '@living-architecture/riviere-extract-config-published-language'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { validateAiExtractResponse } from './validate-ai-extract-response'

function builder() {
  const subject = RiviereBuilder.parse({
    name: 'Shop',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
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
  return subject
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

const fallbackFilePath = 'src/orders/checkout.ts'
const sourcePaths = ['src/orders/checkout.ts']

function validate(
  subject: RiviereBuilder,
  input: Readonly<{
    response?: AiExtractResponse
    config?: AiExtractConfig
    sourcePaths?: readonly string[]
  }> = {},
) {
  return validateAiExtractResponse({
    response: input.response ?? response(),
    config: input.config ?? config(),
    builder: subject,
    repositoryName: 'shop',
    sourcePaths: input.sourcePaths ?? sourcePaths,
  })
}

describe('validateAiExtractResponse', () => {
  it('stamps the batch file and default link type on drafts without a source location', () => {
    const result = validate(builder(), {
      response: response({
        components: [
          {
            type: 'Event',
            name: 'OrderShipped',
            domain: 'orders',
            module: 'ordering',
            eventName: 'order-shipped',
          },
        ],
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:placeorder',
          },
        ],
      }),
    })

    expect(result).toStrictEqual({
      success: true,
      response: {
        components: [
          {
            type: 'Event',
            name: 'OrderShipped',
            domain: 'orders',
            module: 'ordering',
            eventName: 'order-shipped',
            sourceLocation: { repository: 'shop', filePath: fallbackFilePath },
          },
        ],
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:placeorder',
            type: 'sync',
            sourceLocation: { repository: 'shop', filePath: fallbackFilePath },
          },
        ],
      },
    })
  })

  it('falls back to the AI extract directory when the batch has no source files', () => {
    const result = validate(builder(), {
      response: response({
        components: [{ type: 'UseCase', name: 'ShipOrder', domain: 'orders', module: 'ordering' }],
      }),
      sourcePaths: [],
    })

    assert(result.success)
    expect(result.response.components[0]?.sourceLocation).toStrictEqual({
      repository: 'shop',
      filePath: '.riviere/ai-extract',
    })
  })

  it('keeps an explicit source location and link type', () => {
    const result = validate(builder(), {
      response: response({
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:placeorder',
            type: 'async',
            sourceLocation: { repository: 'ai-repo', filePath: 'src/orders/checkout.ts' },
          },
        ],
      }),
    })

    expect(result).toStrictEqual({
      success: true,
      response: {
        components: [],
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:placeorder',
            type: 'async',
            sourceLocation: { repository: 'ai-repo', filePath: 'src/orders/checkout.ts' },
          },
        ],
      },
    })
  })

  it('rejects drafts for domains the graph has not declared', () => {
    const result = validate(builder(), {
      response: response({
        components: [
          { type: 'UseCase', name: 'BillCustomer', domain: 'billing', module: 'invoicing' },
          { type: 'UseCase', name: 'RefundCustomer', domain: 'billing', module: 'refunds' },
        ],
      }),
    })

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'UNDECLARED_IMPORT_DOMAIN',
      reason: 'AI extract writes undeclared domains: billing',
    })
  })

  it('rejects components when outputs.add-components is false', () => {
    const result = validate(builder(), {
      config: config({ outputs: { addComponents: false, addLinks: true } }),
      response: response({
        components: [{ type: 'UseCase', name: 'PlaceOrder', domain: 'orders', module: 'ordering' }],
      }),
    })

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_UNREQUESTED_ADDITION',
      reason: "AI response included components but 'outputs.add-components' is false",
    })
  })

  it('rejects links when outputs.add-links is false', () => {
    const result = validate(builder(), {
      config: config({ outputs: { addComponents: true, addLinks: false } }),
      response: response({
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:placeorder',
            type: 'async',
          },
        ],
      }),
    })

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_UNREQUESTED_ADDITION',
      reason: "AI response included links but 'outputs.add-links' is false",
    })
  })

  it('rejects a component type outside the selection', () => {
    const result = validate(builder(), {
      config: config({ selection: { from: ['missing-events'], componentTypes: ['UseCase'] } }),
      response: response({
        components: [
          {
            type: 'Event',
            name: 'OrderShipped',
            domain: 'orders',
            module: 'ordering',
            eventName: 'order-shipped',
          },
        ],
      }),
    })

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_UNREQUESTED_ADDITION',
      reason:
        "AI response included a component of type 'Event' but 'selection.component-types' allows [UseCase]",
    })
  })

  it('rejects the same component ID declared twice in one response', () => {
    const result = validate(builder(), {
      response: response({
        components: [
          { type: 'UseCase', name: 'PlaceOrder', domain: 'orders', module: 'ordering' },
          { type: 'UseCase', name: 'PlaceOrder', domain: 'orders', module: 'ordering' },
        ],
      }),
    })

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_DUPLICATE_CANDIDATE',
      reason: "AI response declared component 'orders:ordering:usecase:placeorder' more than once",
    })
  })

  it('rejects the same link declared twice in one response', () => {
    const link = {
      source: 'orders:ordering:event:orderplaced',
      target: 'orders:ordering:usecase:placeorder',
      type: 'async' as const,
    }
    const result = validate(builder(), { response: response({ links: [link, link] }) })

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_DUPLICATE_CANDIDATE',
      reason:
        "AI response declared link 'orders:ordering:event:orderplaced -> orders:ordering:usecase:placeorder' more than once",
    })
  })

  it('accepts a source location that only differs by separators and a trailing slash', () => {
    const result = validate(builder(), {
      response: response({
        components: [
          {
            type: 'UseCase',
            name: 'PlaceOrder',
            domain: 'orders',
            module: 'ordering',
            sourceLocation: { repository: 'ai', filePath: 'src\\orders\\checkout.ts\\' },
          },
        ],
      }),
    })

    expect(result.success).toBe(true)
  })

  it('rejects a component outside the loaded sources', () => {
    const result = validate(builder(), {
      response: response({
        components: [
          {
            type: 'UseCase',
            name: 'PlaceOrder',
            domain: 'orders',
            module: 'ordering',
            sourceLocation: { repository: 'ai', filePath: 'src/orders/unknown.ts' },
          },
        ],
      }),
    })

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_OUT_OF_SCOPE_SOURCE',
      reason:
        "AI response included a component with source location 'src/orders/unknown.ts' that is not one of the loaded sources",
    })
  })

  it('rejects a link outside the loaded sources', () => {
    const result = validate(builder(), {
      response: response({
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:placeorder',
            sourceLocation: { repository: 'ai', filePath: 'src/orders/unknown.ts' },
          },
        ],
      }),
    })

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_OUT_OF_SCOPE_SOURCE',
      reason:
        "AI response included a link with source location 'src/orders/unknown.ts' that is not one of the loaded sources",
    })
  })

  it('rejects a link whose endpoint is not in the graph', () => {
    const result = validate(builder(), {
      response: response({
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:shiporder',
          },
        ],
      }),
    })

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_UNKNOWN_LINK_TARGET',
      reason:
        "AI response included a link to 'orders:ordering:usecase:shiporder' but that component is not present in the graph",
    })
  })
})
