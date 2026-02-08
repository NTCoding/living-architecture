import {
  describe, it, expect 
} from 'vitest'
import { detectSubscribeConnections } from './detect-subscribe-connections'
import { buildComponent } from '../call-graph/call-graph-fixtures'
import { ConnectionDetectionError } from '../connection-detection-error'

describe('detectSubscribeConnections', () => {
  it('returns async link from Event to EventHandler when subscribedEvents matches eventName', () => {
    const event = buildComponent('OrderPlaced', '/src/events.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const handler = buildComponent('OrderPlacedHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['OrderPlaced'] },
    })
    const result = detectSubscribeConnections([event, handler], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:event:OrderPlaced',
        target: 'orders:eventHandler:OrderPlacedHandler',
        type: 'async',
      }),
    ])
  })

  it('returns multiple links when handler subscribes to multiple events', () => {
    const event1 = buildComponent('OrderPlaced', '/src/events.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const event2 = buildComponent('OrderShipped', '/src/events.ts', 5, {
      type: 'event',
      metadata: { eventName: 'OrderShipped' },
    })
    const handler = buildComponent('OrderLifecycleHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['OrderPlaced', 'OrderShipped'] },
    })
    const result = detectSubscribeConnections([event1, event2, handler], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(2)
    expect(result).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'orders:event:OrderPlaced',
          target: 'orders:eventHandler:OrderLifecycleHandler',
          type: 'async',
        }),
        expect.objectContaining({
          source: 'orders:event:OrderShipped',
          target: 'orders:eventHandler:OrderLifecycleHandler',
          type: 'async',
        }),
      ]),
    )
  })

  it('returns empty array when no eventHandler components exist', () => {
    const event = buildComponent('OrderPlaced', '/src/events.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const result = detectSubscribeConnections([event], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })

  it('returns empty array when handler has empty subscribedEvents', () => {
    const handler = buildComponent('EmptyHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: [] },
    })
    const result = detectSubscribeConnections([handler], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })

  it('throws ConnectionDetectionError in strict mode when subscribed event matches no Event component', () => {
    const handler = buildComponent('OrphanHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['NonExistentEvent'] },
    })
    expect(() =>
      detectSubscribeConnections([handler], {
        strict: true,
        repository: 'test-repo',
      }),
    ).toThrow(ConnectionDetectionError)
  })

  it('returns uncertain link in lenient mode when subscribed event matches no Event component', () => {
    const handler = buildComponent('OrphanHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['NonExistentEvent'] },
    })
    const result = detectSubscribeConnections([handler], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: '_unresolved',
        target: 'orders:eventHandler:OrphanHandler',
        type: 'async',
        _uncertain: expect.stringContaining('NonExistentEvent'),
      }),
    ])
  })

  it('uses exact case-sensitive matching for event names', () => {
    const event = buildComponent('OrderPlaced', '/src/events.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const handler = buildComponent('WrongCaseHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['orderplaced'] },
    })
    const result = detectSubscribeConnections([event, handler], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([
      expect.objectContaining({ _uncertain: expect.stringContaining('orderplaced') }),
    ])
  })

  it('treats empty or whitespace-only subscribed event names as no-match in lenient mode', () => {
    const event = buildComponent('OrderPlaced', '/src/events.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const handler = buildComponent('WhitespaceHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['', '   '] },
    })
    const result = detectSubscribeConnections([event, handler], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(2)
    expect(result).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '_unresolved',
          target: 'orders:eventHandler:WhitespaceHandler',
          _uncertain: expect.any(String),
        }),
      ]),
    )
  })

  it('includes sourceLocation from handler component', () => {
    const event = buildComponent('OrderPlaced', '/src/events.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const handler = buildComponent('OrderPlacedHandler', '/src/handlers.ts', 10, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['OrderPlaced'] },
    })
    const result = detectSubscribeConnections([event, handler], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result[0]?.sourceLocation).toStrictEqual(
      expect.objectContaining({
        filePath: '/src/handlers.ts',
        lineNumber: 10,
      }),
    )
  })

  it('skips non-eventHandler components', () => {
    const useCase = buildComponent('PlaceOrder', '/src/use-cases.ts', 1, {
      type: 'useCase',
      metadata: { subscribedEvents: ['OrderPlaced'] },
    })
    const result = detectSubscribeConnections([useCase], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })

  it('skips handlers without subscribedEvents metadata', () => {
    const handler = buildComponent('NoMetadataHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: {},
    })
    const result = detectSubscribeConnections([handler], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })

  it('produces one link per duplicate entry in subscribedEvents', () => {
    const event = buildComponent('OrderPlaced', '/src/events.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const handler = buildComponent('DupHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['OrderPlaced', 'OrderPlaced'] },
    })
    const result = detectSubscribeConnections([event, handler], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(2)
  })

  it('filters non-string entries from subscribedEvents', () => {
    const event = buildComponent('OrderPlaced', '/src/events.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const mixedEvents = buildMixedSubscribedEvents()
    const handler = buildComponent('MixedHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: mixedEvents },
    })
    const result = detectSubscribeConnections([event, handler], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        source: 'orders:event:OrderPlaced',
        target: 'orders:eventHandler:MixedHandler',
      }),
    )
  })

  it('throws ConnectionDetectionError in strict mode when subscribed event matches multiple Events', () => {
    const event1 = buildComponent('OrderPlacedA', '/src/events.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const event2 = buildComponent('OrderPlacedB', '/src/events2.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const handler = buildComponent('AmbigHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['OrderPlaced'] },
    })

    expect(() =>
      detectSubscribeConnections([event1, event2, handler], {
        strict: true,
        repository: 'test-repo',
      }),
    ).toThrow(ConnectionDetectionError)
  })

  it('returns uncertain link in lenient mode when subscribed event matches multiple Events', () => {
    const event1 = buildComponent('OrderPlacedA', '/src/events.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const event2 = buildComponent('OrderPlacedB', '/src/events2.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const handler = buildComponent('AmbigHandler', '/src/handlers.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['OrderPlaced'] },
    })
    const result = detectSubscribeConnections([event1, event2, handler], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: '_unresolved',
        target: 'orders:eventHandler:AmbigHandler',
        type: 'async',
        _uncertain: expect.stringContaining('ambiguous'),
      }),
    ])
  })
})

function buildMixedSubscribedEvents(): string[] {
  const parsed: string[] = JSON.parse('["OrderPlaced", 123, null]')
  return parsed
}
