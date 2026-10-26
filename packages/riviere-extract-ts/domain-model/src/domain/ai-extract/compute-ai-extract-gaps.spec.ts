import { describe, expect, it } from 'vitest'
import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { WorkflowDiagnostic } from '../workflow-diagnostic'
import { computeAiExtractGaps } from './compute-ai-extract-gaps'

function config(overrides: Partial<AiExtractConfig> = {}): AiExtractConfig {
  return {
    command: 'claude',
    args: [],
    timeoutSeconds: 60,
    sources: ['src/**/*.ts'],
    selection: {
      from: ['missing-events'],
      componentTypes: ['Event', 'UseCase', 'EventHandler'],
    },
    outputs: { addComponents: true, addLinks: true },
    context: { exclude: [], maxFilesPerBatch: 10, maxBatches: 2 },
    ...overrides,
  }
}

function builder() {
  return RiviereBuilder.parse({
    name: 'Shop',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
}

function source(filePath: string, content: string) {
  return { filePath, content }
}

describe('computeAiExtractGaps', () => {
  it('lists existing component IDs, existing links, and one candidate per publishing call site', () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderCancelled',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-cancelled',
      sourceLocation: { repository: 'shop', filePath: '/repo/src/orders/ordering/order.ts' },
    })
    subject.upsertUseCase({
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'ordering',
      sourceLocation: { repository: 'shop', filePath: '/repo/src/orders/ordering/place.ts' },
    })
    subject.upsertLink({
      from: 'orders:ordering:event:ordercancelled',
      to: 'orders:ordering:usecase:placeorder',
      type: 'async',
      sourceLocation: { repository: 'shop', filePath: '/repo/src/orders/ordering/order.ts' },
    })

    const gaps = computeAiExtractGaps({
      config: config(),
      components: subject.components(),
      links: subject.links(),
      unresolvedDiagnostics: [],
      files: [source('/repo/src/orders/ordering/checkout.ts', "  publish('OrderPlaced')")],
    })

    expect(gaps.existingComponentIds).toStrictEqual([
      'orders:ordering:event:ordercancelled',
      'orders:ordering:usecase:placeorder',
    ])
    expect(gaps.existingLinks).toStrictEqual([
      {
        source: 'orders:ordering:event:ordercancelled',
        target: 'orders:ordering:usecase:placeorder',
      },
    ])
    expect(gaps.candidates).toStrictEqual([
      {
        category: 'missing-events',
        componentId: 'orders:ordering:event:orderplaced',
        evidence: "publish('OrderPlaced')",
        filePath: '/repo/src/orders/ordering/checkout.ts',
        line: 1,
        name: 'OrderPlaced',
      },
    ])
  })

  it('skips publishing call sites whose component ID already exists', () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-placed',
      sourceLocation: { repository: 'shop', filePath: '/repo/src/orders/ordering/order.ts' },
    })

    const gaps = computeAiExtractGaps({
      config: config(),
      components: subject.components(),
      links: [],
      unresolvedDiagnostics: [],
      files: [source('/repo/src/orders/ordering/checkout.ts', "emit('OrderPlaced')")],
    })

    expect(gaps.candidates).toStrictEqual([])
  })

  it('derives use case candidates from use case call sites', () => {
    const gaps = computeAiExtractGaps({
      config: config({ selection: { from: ['missing-use-cases'], componentTypes: ['UseCase'] } }),
      components: [],
      links: [],
      unresolvedDiagnostics: [],
      files: [source('/repo/src/orders/ordering/checkout.ts', 'useCase(new PlaceOrder())')],
    })

    expect(gaps.candidates).toStrictEqual([
      {
        category: 'missing-use-cases',
        componentId: 'orders:ordering:usecase:placeorder',
        evidence: 'useCase(new PlaceOrder())',
        filePath: '/repo/src/orders/ordering/checkout.ts',
        line: 1,
        name: 'PlaceOrder',
      },
    ])
  })

  it('derives event handler candidates for events without a handler link', () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-placed',
      sourceLocation: { repository: 'shop', filePath: '/repo/src/orders/ordering/order.ts' },
    })

    const gaps = computeAiExtractGaps({
      config: config({
        selection: { from: ['missing-event-handlers'], componentTypes: ['EventHandler'] },
      }),
      components: subject.components(),
      links: [],
      unresolvedDiagnostics: [],
      files: [
        source('/repo/src/orders/ordering/handler.ts', "subscribe('order-placed')\non('Other')"),
      ],
    })

    expect(gaps.candidates).toStrictEqual([
      {
        category: 'missing-event-handlers',
        componentId: 'orders:ordering:eventhandler:orderplacedhandler',
        evidence: "subscribe('order-placed')",
        filePath: '/repo/src/orders/ordering/handler.ts',
        line: 1,
        name: 'order-placed',
      },
    ])
  })

  it('skips events that already link to an event handler', () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-placed',
      sourceLocation: { repository: 'shop', filePath: '/repo/src/orders/ordering/order.ts' },
    })
    subject.upsertEventHandler({
      name: 'OrderPlacedHandler',
      domain: 'orders',
      module: 'ordering',
      subscribedEvents: ['order-placed'],
      sourceLocation: { repository: 'shop', filePath: '/repo/src/orders/ordering/handler.ts' },
    })
    subject.upsertLink({
      from: 'orders:ordering:event:orderplaced',
      to: 'orders:ordering:eventhandler:orderplacedhandler',
      type: 'async',
      sourceLocation: { repository: 'shop', filePath: '/repo/src/orders/ordering/order.ts' },
    })

    const gaps = computeAiExtractGaps({
      config: config({
        selection: { from: ['missing-event-handlers'], componentTypes: ['EventHandler'] },
      }),
      components: subject.components(),
      links: subject.links(),
      unresolvedDiagnostics: [],
      files: [source('/repo/src/orders/ordering/handler.ts', "subscribe('order-placed')")],
    })

    expect(gaps.candidates).toStrictEqual([])
  })

  it('reports uncertain link diagnostics as candidates and ignores other diagnostics', () => {
    const uncertainLink = WorkflowDiagnostic.fromUncertainLink({
      source: 'orders:ordering:api:place',
      target: 'orders:ordering:usecase:placeorder',
    })

    const gaps = computeAiExtractGaps({
      config: config({ selection: { from: ['uncertain-links'], componentTypes: ['UseCase'] } }),
      components: [],
      links: [],
      unresolvedDiagnostics: [
        uncertainLink,
        WorkflowDiagnostic.fromUnmappedRecord('service', 'svc'),
      ],
      files: [],
    })

    expect(gaps.candidates).toStrictEqual([
      {
        category: 'uncertain-links',
        source: 'orders:ordering:api:place',
        target: 'orders:ordering:usecase:placeorder',
        evidence: uncertainLink.describe(),
      },
    ])
  })

  it('returns no candidates when no gap categories are requested', () => {
    const gaps = computeAiExtractGaps({
      config: config({ selection: { from: [], componentTypes: ['Event'] } }),
      components: [],
      links: [],
      unresolvedDiagnostics: [],
      files: [source('/repo/src/orders/ordering/checkout.ts', "publish('OrderPlaced')")],
    })

    expect(gaps.candidates).toStrictEqual([])
  })

  it('skips publishing call sites that are not inside a domain directory', () => {
    const gaps = computeAiExtractGaps({
      config: config(),
      components: [],
      links: [],
      unresolvedDiagnostics: [],
      files: [source('checkout.ts', "publish('OrderPlaced')")],
    })

    expect(gaps.candidates).toStrictEqual([])
  })

  it('uses the domain as module when the file sits directly in a domain folder', () => {
    const gaps = computeAiExtractGaps({
      config: config(),
      components: [],
      links: [],
      unresolvedDiagnostics: [],
      files: [source('/repo/src/orders/checkout.ts', "publish('OrderPlaced')")],
    })

    expect(gaps.candidates).toStrictEqual([
      {
        category: 'missing-events',
        componentId: 'orders:orders:event:orderplaced',
        evidence: "publish('OrderPlaced')",
        filePath: '/repo/src/orders/checkout.ts',
        line: 1,
        name: 'OrderPlaced',
      },
    ])
  })

  it('skips use case call sites that are not inside a domain directory', () => {
    const gaps = computeAiExtractGaps({
      config: config({ selection: { from: ['missing-use-cases'], componentTypes: ['UseCase'] } }),
      components: [],
      links: [],
      unresolvedDiagnostics: [],
      files: [source('checkout.ts', 'useCase(new PlaceOrder())')],
    })

    expect(gaps.candidates).toStrictEqual([])
  })

  it('skips event handler call sites when the event carries no domain directory', () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-placed',
      sourceLocation: { repository: 'shop', filePath: 'order.ts' },
    })

    const gaps = computeAiExtractGaps({
      config: config({
        selection: { from: ['missing-event-handlers'], componentTypes: ['EventHandler'] },
      }),
      components: subject.components(),
      links: [],
      unresolvedDiagnostics: [],
      files: [source('/repo/src/orders/ordering/handler.ts', "subscribe('order-placed')")],
    })

    expect(gaps.candidates).toStrictEqual([])
  })

  it('skips a use case call site whose component already exists', () => {
    const subject = builder()
    subject.upsertUseCase({
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'ordering',
      sourceLocation: { repository: 'shop', filePath: '/repo/src/orders/ordering/place.ts' },
    })

    const gaps = computeAiExtractGaps({
      config: config({ selection: { from: ['missing-use-cases'], componentTypes: ['UseCase'] } }),
      components: subject.components(),
      links: subject.links(),
      unresolvedDiagnostics: [],
      files: [source('/repo/src/orders/ordering/checkout.ts', 'useCase(new PlaceOrder())')],
    })

    expect(gaps.candidates).toStrictEqual([])
  })

  it('skips an event handler whose component already exists', () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-placed',
      sourceLocation: { repository: 'shop', filePath: '/repo/src/orders/ordering/order.ts' },
    })
    subject.upsertEventHandler({
      name: 'OrderPlacedHandler',
      domain: 'orders',
      module: 'ordering',
      subscribedEvents: ['order-placed'],
      sourceLocation: { repository: 'shop', filePath: '/repo/src/orders/ordering/handler.ts' },
    })

    const gaps = computeAiExtractGaps({
      config: config({
        selection: { from: ['missing-event-handlers'], componentTypes: ['EventHandler'] },
      }),
      components: subject.components(),
      links: [],
      unresolvedDiagnostics: [],
      files: [source('/repo/src/orders/ordering/checkout.ts', "subscribe('order-placed')")],
    })

    expect(gaps.candidates).toStrictEqual([])
  })
})
