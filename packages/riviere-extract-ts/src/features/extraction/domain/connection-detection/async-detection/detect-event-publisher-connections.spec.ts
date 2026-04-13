import {
  describe, it, expect 
} from 'vitest'
import { detectEventPublisherConnections } from './detect-event-publisher-connections'
import { ConnectionDetectionError } from '../connection-detection-error'
import { buildComponent } from '../call-graph/call-graph-fixtures'

const defaultOptions = {
  strict: false,
  repository: 'test-repo',
}

function eventPublisherConfig(fromType = 'eventSender', metadataKey = 'publishedEventType') {
  return [
    {
      fromType,
      metadataKey,
    },
  ]
}

describe('detectEventPublisherConnections', () => {
  it('returns empty array when eventPublishers config is empty', () => {
    const publisher = buildComponent('Sender', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: { publishedEventType: 'OrderPlaced' },
    })
    expect(detectEventPublisherConnections([publisher], [], defaultOptions)).toStrictEqual([])
  })

  it('returns async link when metadataKey value matches an event eventName', () => {
    const event = buildComponent('OrderPlacedEvent', '/src/event.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlacedEvent' },
    })
    const publisher = buildComponent('OrderSender', '/src/sender.ts', 5, {
      type: 'eventSender',
      metadata: { publishedEventType: 'OrderPlacedEvent' },
    })

    const result = detectEventPublisherConnections(
      [event, publisher],
      eventPublisherConfig(),
      defaultOptions,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:eventSender:ordersender',
        target: 'orders:orders-module:event:orderplacedevent',
        type: 'async',
      }),
    ])
  })

  it('returns empty array when no components match fromType', () => {
    const event = buildComponent('SomeEvent', '/src/event.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SomeEvent' },
    })

    const result = detectEventPublisherConnections(
      [event],
      eventPublisherConfig('eventSender'),
      defaultOptions,
    )

    expect(result).toStrictEqual([])
  })

  it('reads metadataKey from config, not a hard-coded field name', () => {
    const event = buildComponent('OrderPlaced', '/src/event.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const publisher = buildComponent('Sender', '/src/sender.ts', 1, {
      type: 'myPublisher',
      metadata: { customKey: 'OrderPlaced' },
    })

    const result = detectEventPublisherConnections(
      [event, publisher],
      [
        {
          fromType: 'myPublisher',
          metadataKey: 'customKey',
        },
      ],
      defaultOptions,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:myPublisher:sender',
        target: 'orders:orders-module:event:orderplaced',
        type: 'async',
      }),
    ])
  })

  it('returns uncertain link in lenient mode when metadataKey value matches no event', () => {
    const publisher = buildComponent('NoMatchSender', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: { publishedEventType: 'MissingEvent' },
    })

    const result = detectEventPublisherConnections(
      [publisher],
      eventPublisherConfig(),
      defaultOptions,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:eventSender:nomatchsender',
        target: '_unresolved',
        type: 'async',
        _uncertain: expect.stringContaining('MissingEvent'),
      }),
    ])
  })

  it('throws ConnectionDetectionError in strict mode when no event matches', () => {
    const publisher = buildComponent('StrictSender', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: { publishedEventType: 'NonExistentEvent' },
    })
    const act = () =>
      detectEventPublisherConnections([publisher], eventPublisherConfig(), {
        strict: true,
        repository: 'test-repo',
      })
    expect(act).toThrow(ConnectionDetectionError)
    expect(act).toThrow(
      expect.objectContaining({ message: expect.stringContaining('NonExistentEvent') }),
    )
  })

  it('returns uncertain link in lenient mode when publishedEventType matches multiple events', () => {
    const event1 = buildComponent('SharedA', '/src/a.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedName' },
    })
    const event2 = buildComponent('SharedB', '/src/b.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedName' },
    })
    const publisher = buildComponent('AmbigSender', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: { publishedEventType: 'SharedName' },
    })

    const result = detectEventPublisherConnections(
      [event1, event2, publisher],
      eventPublisherConfig(),
      defaultOptions,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:eventSender:ambigsender',
        target: '_unresolved',
        _uncertain: expect.stringContaining('ambiguous'),
      }),
    ])
  })

  it('throws ConnectionDetectionError in strict mode when publishedEventType matches multiple events', () => {
    const event1 = buildComponent('AmbigA', '/src/a.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedName' },
    })
    const event2 = buildComponent('AmbigB', '/src/b.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedName' },
    })
    const publisher = buildComponent('StrictSender', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: { publishedEventType: 'SharedName' },
    })

    const act = () =>
      detectEventPublisherConnections([event1, event2, publisher], eventPublisherConfig(), {
        strict: true,
        repository: 'test-repo',
      })
    expect(act).toThrow(ConnectionDetectionError)
    expect(act).toThrow(expect.objectContaining({ message: expect.stringContaining('ambiguous') }))
  })

  it('includes sourceLocation with publisher file and line', () => {
    const event = buildComponent('LocEvent', '/src/event.ts', 2, {
      type: 'event',
      metadata: { eventName: 'LocEvent' },
    })
    const publisher = buildComponent('LocSender', '/src/sender.ts', 10, {
      type: 'eventSender',
      metadata: { publishedEventType: 'LocEvent' },
    })

    const result = detectEventPublisherConnections(
      [event, publisher],
      eventPublisherConfig(),
      defaultOptions,
    )

    expect(result[0]?.sourceLocation).toStrictEqual(
      expect.objectContaining({
        repository: 'test-repo',
        filePath: '/src/sender.ts',
        lineNumber: 10,
      }),
    )
  })

  it('handles multiple eventPublisher configs with different fromType values', () => {
    const event = buildComponent('OrderPlaced', '/src/event.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const sender1 = buildComponent('Sender1', '/src/sender1.ts', 1, {
      type: 'typeA',
      metadata: { keyA: 'OrderPlaced' },
    })
    const sender2 = buildComponent('Sender2', '/src/sender2.ts', 1, {
      type: 'typeB',
      metadata: { keyB: 'OrderPlaced' },
    })

    const result = detectEventPublisherConnections(
      [event, sender1, sender2],
      [
        {
          fromType: 'typeA',
          metadataKey: 'keyA',
        },
        {
          fromType: 'typeB',
          metadataKey: 'keyB',
        },
      ],
      defaultOptions,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:typeA:sender1',
        target: 'orders:orders-module:event:orderplaced',
        type: 'async',
      }),
      expect.objectContaining({
        source: 'orders:orders-module:typeB:sender2',
        target: 'orders:orders-module:event:orderplaced',
        type: 'async',
      }),
    ])
  })

  it('uses exact case-sensitive matching for event names', () => {
    const event = buildComponent('OrderPlaced', '/src/event.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const publisher = buildComponent('CaseSender', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: { publishedEventType: 'orderplaced' },
    })

    const result = detectEventPublisherConnections(
      [event, publisher],
      eventPublisherConfig(),
      defaultOptions,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({ _uncertain: expect.stringContaining('orderplaced') }),
    ])
  })

  it('produces one link per entry when metadataKey value is a string array', () => {
    const event1 = buildComponent('OrderPlaced', '/src/event.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const event2 = buildComponent('PaymentReceived', '/src/event.ts', 2, {
      type: 'event',
      metadata: { eventName: 'PaymentReceived' },
    })
    const publisher = buildComponent('MultiSender', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: { publishedEventType: ['OrderPlaced', 'PaymentReceived'] },
    })

    const result = detectEventPublisherConnections(
      [event1, event2, publisher],
      eventPublisherConfig(),
      defaultOptions,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:eventSender:multisender',
        target: 'orders:orders-module:event:orderplaced',
        type: 'async',
      }),
      expect.objectContaining({
        source: 'orders:orders-module:eventSender:multisender',
        target: 'orders:orders-module:event:paymentreceived',
        type: 'async',
      }),
    ])
  })
})
