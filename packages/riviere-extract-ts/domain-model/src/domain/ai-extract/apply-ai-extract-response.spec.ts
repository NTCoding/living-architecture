import { describe, expect, it } from 'vitest'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language'
import { WorkflowDiagnostic } from '../workflow-diagnostic'
import { applyAiExtractResponse } from './apply-ai-extract-response'
import type {
  ResolvedAiExtractResponse,
  ResolvedComponentDraft,
  ResolvedLinkEntry,
} from './validate-ai-extract-response'

const sourceLocation = { repository: 'shop', filePath: '/repo/src/orders/checkout.ts' }

function builder(): RiviereBuilder {
  return RiviereBuilder.parse({
    name: 'Shop',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
}

function response(overrides: Partial<ResolvedAiExtractResponse> = {}): ResolvedAiExtractResponse {
  return { components: [], links: [], ...overrides }
}

function link(overrides: Partial<ResolvedLinkEntry> = {}): ResolvedLinkEntry {
  return {
    source: 'orders:ordering:event:orderplaced',
    target: 'orders:ordering:eventhandler:orderplacedhandler',
    type: 'async',
    sourceLocation,
    ...overrides,
  }
}

const eventDraft: ResolvedComponentDraft = {
  type: 'Event',
  name: 'OrderPlaced',
  domain: 'orders',
  module: 'ordering',
  eventName: 'order-placed',
  sourceLocation,
}

const handlerDraft: ResolvedComponentDraft = {
  type: 'EventHandler',
  name: 'OrderPlacedHandler',
  domain: 'orders',
  module: 'ordering',
  subscribedEvents: ['order-placed'],
  sourceLocation,
}

function apply(subject: RiviereBuilder, value: ResolvedAiExtractResponse) {
  return applyAiExtractResponse(subject, value, {
    repositoryName: 'shop',
    unresolvedDiagnostics: [],
  })
}

function builderWithRelationshipTypes(): RiviereBuilder {
  const graph: RiviereGraph = {
    version: '1.0',
    metadata: {
      sources: [{ repository: 'shop' }],
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
      relationshipTypes: { triggers: { description: 'Triggers the target' } },
    },
    components: [],
    links: [],
  }
  return RiviereBuilder.fromGraph(graph)
}

function customBuilder(): RiviereBuilder {
  const graph: RiviereGraph = {
    version: '1.0',
    metadata: {
      sources: [{ repository: 'shop' }],
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
      customTypes: { Queue: {} },
    },
    components: [],
    links: [],
  }
  return RiviereBuilder.fromGraph(graph)
}

describe('applyAiExtractResponse', () => {
  it('applies every component draft type to the builder', () => {
    const subject = customBuilder()
    const result = apply(
      subject,
      response({
        components: [
          {
            type: 'UI',
            name: 'CheckoutScreen',
            domain: 'orders',
            module: 'ordering',
            route: '/checkout',
            sourceLocation,
          },
          {
            type: 'API',
            name: 'PlaceOrder',
            domain: 'orders',
            module: 'ordering',
            apiType: 'REST',
            sourceLocation,
          },
          {
            type: 'UseCase',
            name: 'PlaceOrder',
            domain: 'orders',
            module: 'ordering',
            sourceLocation,
          },
          {
            type: 'DomainOp',
            name: 'PlaceOrder',
            domain: 'orders',
            module: 'ordering',
            operationName: 'place-order',
            sourceLocation,
          },
          eventDraft,
          handlerDraft,
          {
            type: 'Custom',
            name: 'OrderQueue',
            domain: 'orders',
            module: 'ordering',
            customTypeName: 'Queue',
            sourceLocation,
          },
        ],
      }),
    )

    expect(result).toStrictEqual({ warnings: [], collisions: [], resolvedDiagnostics: [] })
    expect(
      subject
        .components()
        .map((component) => component.id)
        .sort((left, right) => left.localeCompare(right)),
    ).toStrictEqual([
      'orders:ordering:api:placeorder',
      'orders:ordering:custom:orderqueue',
      'orders:ordering:domainop:placeorder',
      'orders:ordering:event:orderplaced',
      'orders:ordering:eventhandler:orderplacedhandler',
      'orders:ordering:ui:checkoutscreen',
      'orders:ordering:usecase:placeorder',
    ])
  })

  it('applies a link between applied components', () => {
    const subject = builder()
    apply(subject, response({ components: [eventDraft, handlerDraft], links: [link()] }))

    expect(subject.links()).toHaveLength(1)
    expect(subject.links()[0]).toMatchObject({
      source: 'orders:ordering:event:orderplaced',
      target: 'orders:ordering:eventhandler:orderplacedhandler',
      type: 'async',
    })
  })

  it('applies the optional relationship type and condition of a link', () => {
    const subject = builderWithRelationshipTypes()
    apply(
      subject,
      response({
        components: [eventDraft, handlerDraft],
        links: [link({ relationshipType: 'triggers', condition: 'when paid' })],
      }),
    )

    expect(subject.links()[0]).toMatchObject({
      relationshipType: 'triggers',
      condition: 'when paid',
    })
  })

  it('reports component and link collisions as collisions and warnings', () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-placed',
      sourceLocation,
    })
    subject.upsertEventHandler({
      name: 'OrderPlacedHandler',
      domain: 'orders',
      module: 'ordering',
      subscribedEvents: ['order-placed'],
      sourceLocation,
    })
    const result = apply(
      subject,
      response({
        components: [eventDraft, handlerDraft],
        links: [link()],
      }),
    )

    expect(result.collisions).toStrictEqual([
      'orders:ordering:event:orderplaced',
      'orders:ordering:eventhandler:orderplacedhandler',
    ])
    expect(result.warnings.map((warning) => warning.code)).toStrictEqual([
      'AI_CANDIDATE_ALREADY_PRESENT',
      'AI_CANDIDATE_ALREADY_PRESENT',
    ])
  })

  it('describes a component collision warning with the canonical component ID', () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-placed',
      sourceLocation,
    })
    const result = apply(subject, response({ components: [eventDraft] }))

    expect(result.warnings).toStrictEqual([
      {
        code: 'AI_CANDIDATE_ALREADY_PRESENT',
        message: "AI candidate already present: 'orders:ordering:event:orderplaced'",
      },
    ])
  })

  it('describes a link collision warning with both endpoints', () => {
    const subject = builder()
    apply(subject, response({ components: [eventDraft, handlerDraft] }))
    subject.upsertLink({
      from: 'orders:ordering:event:orderplaced',
      to: 'orders:ordering:eventhandler:orderplacedhandler',
      type: 'async',
      sourceLocation,
    })
    const result = apply(subject, response({ links: [link()] }))

    expect(result.warnings).toStrictEqual([
      {
        code: 'AI_CANDIDATE_ALREADY_PRESENT',
        message:
          "AI candidate link already present: 'orders:ordering:event:orderplaced' 'orders:ordering:eventhandler:orderplacedhandler'",
      },
    ])
  })

  it('resolves an uncertain-link diagnostic when both endpoints are proposed', () => {
    const subject = builder()
    const diagnostic = WorkflowDiagnostic.fromUncertainLink({
      source: 'orders:ordering:event:orderplaced',
      target: 'orders:ordering:eventhandler:orderplacedhandler',
    })
    const result = applyAiExtractResponse(
      subject,
      response({ components: [eventDraft, handlerDraft] }),
      {
        repositoryName: 'shop',
        unresolvedDiagnostics: [diagnostic],
      },
    )

    expect(result.resolvedDiagnostics).toStrictEqual([diagnostic])
  })

  it('resolves an uncertain-link diagnostic when its exact link is proposed', () => {
    const subject = builder()
    apply(subject, response({ components: [eventDraft, handlerDraft] }))
    const diagnostic = WorkflowDiagnostic.fromUncertainLink({
      source: 'orders:ordering:event:orderplaced',
      target: 'orders:ordering:eventhandler:orderplacedhandler',
    })
    const result = applyAiExtractResponse(subject, response({ links: [link()] }), {
      repositoryName: 'shop',
      unresolvedDiagnostics: [diagnostic],
    })

    expect(result.resolvedDiagnostics).toStrictEqual([diagnostic])
  })

  it('leaves unrelated and unmatched diagnostics unresolved', () => {
    const subject = builder()
    const missingField = WorkflowDiagnostic.fromMissingField(
      'orders:ordering:event:orderplaced',
      'domain',
    )
    const enriched = WorkflowDiagnostic.fromUncertainLink({
      source: 'orders:ordering:event:orderplaced',
      target: 'orders:ordering:usecase:placeorder',
    })
    const result = applyAiExtractResponse(subject, response({ components: [eventDraft] }), {
      repositoryName: 'shop',
      unresolvedDiagnostics: [missingField, enriched],
    })

    expect(result.resolvedDiagnostics).toStrictEqual([])
  })
})
