import {
  describe, it, expect 
} from 'vitest'
import { detectCrossModuleConnections } from './detect-connections'
import { buildComponent } from './call-graph/call-graph-fixtures'
import { ConnectionDetectionError } from './connection-detection-error'

const publisherConfig = [
  {
    fromType: 'eventSender',
    metadataKey: 'publishedEventType',
  },
]

describe('detectCrossModuleConnections', () => {
  it('resolves cross-module subscribe links', () => {
    const event = buildComponent('ShipmentDispatched', '/src/shipping/event.ts', 1, {
      type: 'event',
      domain: 'shipping',
      metadata: { eventName: 'ShipmentDispatched' },
    })
    const handler = buildComponent('handle', '/src/orders/handler.ts', 1, {
      type: 'eventHandler',
      domain: 'orders',
      metadata: { subscribedEvents: ['ShipmentDispatched'] },
    })

    const result = detectCrossModuleConnections([event, handler], { repository: 'test-repo' })

    expect(result.links).toStrictEqual([
      expect.objectContaining({
        source: 'shipping:event:ShipmentDispatched',
        target: 'orders:eventHandler:handle',
        type: 'async',
      }),
    ])
  })

  it('resolves cross-module publish links via eventPublishers config', () => {
    const publisher = buildComponent('OrderPublisher', '/src/orders/pub.ts', 1, {
      type: 'eventSender',
      domain: 'orders',
      metadata: { publishedEventType: 'OrderPlaced' },
    })
    const event = buildComponent('OrderPlacedEvent', '/src/shipping/event.ts', 1, {
      type: 'event',
      domain: 'shipping',
      metadata: { eventName: 'OrderPlaced' },
    })

    const result = detectCrossModuleConnections([publisher, event], {
      repository: 'test-repo',
      eventPublishers: publisherConfig,
    })

    expect(result.links).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventSender:OrderPublisher',
        target: 'shipping:event:OrderPlacedEvent',
        type: 'async',
      }),
    ])
  })

  it('returns empty links when no eventPublishers config provided', () => {
    const publisher = buildComponent('OrderPublisher', '/src/orders/pub.ts', 1, {
      type: 'eventSender',
      domain: 'orders',
      metadata: { publishedEventType: 'OrderPlaced' },
    })
    const event = buildComponent('OrderPlacedEvent', '/src/shipping/event.ts', 1, {
      type: 'event',
      domain: 'shipping',
      metadata: { eventName: 'OrderPlaced' },
    })

    const result = detectCrossModuleConnections([publisher, event], { repository: 'test-repo' })

    expect(result.links).toStrictEqual([])
  })

  it('returns empty links for empty components array', () => {
    const result = detectCrossModuleConnections([], { repository: 'test-repo' })

    expect(result.links).toStrictEqual([])
  })

  it('returns non-negative asyncDetectionMs timing', () => {
    const result = detectCrossModuleConnections([], { repository: 'test-repo' })

    expect(result.timings.asyncDetectionMs).toBeGreaterThanOrEqual(0)
  })

  it('throws in strict mode when publisher has missing metadataKey value', () => {
    const publisher = buildComponent('BadPublisher', '/src/pub.ts', 1, {
      type: 'eventSender',
      metadata: {},
    })

    expect(() =>
      detectCrossModuleConnections([publisher], {
        repository: 'test-repo',
        eventPublishers: publisherConfig,
      }),
    ).toThrow(ConnectionDetectionError)
  })

  it('returns uncertain link in lenient mode when publisher has missing metadataKey value', () => {
    const publisher = buildComponent('BadPublisher', '/src/pub.ts', 1, {
      type: 'eventSender',
      metadata: {},
    })

    const result = detectCrossModuleConnections([publisher], {
      allowIncomplete: true,
      repository: 'test-repo',
      eventPublishers: publisherConfig,
    })

    expect(result.links).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventSender:BadPublisher',
        target: '_unresolved',
        _uncertain: expect.stringContaining('missing required "publishedEventType" metadata'),
      }),
    ])
  })

  it('throws in strict mode when subscribed event does not match any event component', () => {
    const handler = buildComponent('OrphanHandler', '/src/handler.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['NonExistentEvent'] },
    })

    expect(() => detectCrossModuleConnections([handler], { repository: 'test-repo' })).toThrow(
      ConnectionDetectionError,
    )
  })
})
