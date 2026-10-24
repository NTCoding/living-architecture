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

describe('applyAiExtractResponse', () => {
  it('adds component drafts with the project repository stamped on sourceLocation', () => {
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
        ],
      }),
      { repositoryName: 'shop', config: config(), suppressedComponentIds: [] },
    )

    expect(result).toStrictEqual({ success: true, warnings: [] })
    const component = subject.components().find((item) => item.name === 'OrderPlaced')
    expect(component).toBeDefined()
    expect(component?.sourceLocation).toStrictEqual({
      repository: 'shop',
      filePath: 'src/orders/checkout.ts',
    })
  })

  it('records a warning when a draft collides with an existing component', () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'infrastructure',
      eventName: 'order-placed',
      sourceLocation: { repository: 'shop', filePath: 'src/orders/order.ts' },
    })
    const existing = subject.components().find((item) => item.name === 'OrderPlaced')

    const result = applyAiExtractResponse(
      subject,
      response({
        components: [
          {
            type: 'Event',
            name: 'OrderPlaced',
            domain: 'orders',
            module: 'infrastructure',
            eventName: 'order-placed',
            description: 'new description',
            sourceLocation,
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
          message: "AI candidate already present: 'orders:infrastructure:event:orderplaced'",
        },
      ],
    })
    const after = subject.components().find((item) => item.name === 'OrderPlaced')
    expect(after?.description).toBe(existing?.description)
  })

  it('fails when a draft type is not allowed by selection', () => {
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
        ],
      }),
      {
        repositoryName: 'shop',
        config: config({ selection: { from: ['missing-events'], componentTypes: ['UseCase'] } }),
        suppressedComponentIds: [],
      },
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_UNREQUESTED_ADDITION',
      reason:
        "AI response included a component of type 'Event' but 'selection.component-types' allows [UseCase]",
    })
  })

  it('fails when components are present but add-components is false', () => {
    const subject = builder()
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
      }),
      {
        repositoryName: 'shop',
        config: config({ outputs: { addComponents: false, addLinks: true } }),
        suppressedComponentIds: [],
      },
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_UNREQUESTED_ADDITION',
      reason: "AI response included components but 'outputs.add-components' is false",
    })
  })

  it('fails when links are present but add-links is false', () => {
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
    const result = applyAiExtractResponse(
      subject,
      response({
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:placeorder',
            type: 'async',
            sourceLocation,
          },
        ],
      }),
      {
        repositoryName: 'shop',
        config: config({ outputs: { addComponents: true, addLinks: false } }),
        suppressedComponentIds: [],
      },
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_UNREQUESTED_ADDITION',
      reason: "AI response included links but 'outputs.add-links' is false",
    })
  })

  it('fails when a link endpoint is not present in the graph', () => {
    const subject = builder()
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
      success: false,
      errorCode: 'AI_EXTRACT_UNKNOWN_LINK_TARGET',
      reason:
        "AI response included a link from 'orders:ordering:event:orderplaced' to 'orders:ordering:usecase:placeorder' but 'orders:ordering:event:orderplaced' is not present in the graph",
    })
  })
})
