import {
  describe, it, expect 
} from 'vitest'
import { detectPublishConnections } from './detect-publish-connections'
import { buildComponent } from '../call-graph/call-graph-fixtures'

describe('detectPublishConnections', () => {
  it('returns async link when publishedEventType metadata matches an event', () => {
    const event = buildComponent('OrderPlacedEvent', '/src/event.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlacedEvent' },
    })
    const publisher = buildComponent('OrderPublisher', '/src/pub.ts', 5, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'OrderPlacedEvent' },
    })

    const result = detectPublishConnections([event, publisher], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventPublisher:OrderPublisher',
        target: 'orders:event:OrderPlacedEvent',
        type: 'async',
      }),
    ])
  })

  it('returns empty array when components list is empty', () => {
    const result = detectPublishConnections([], {
      strict: false,
      repository: 'test-repo',
    })
    expect(result).toStrictEqual([])
  })

  it('returns empty array when no eventPublisher components exist', () => {
    const event = buildComponent('SomeEvent', '/src/no-pub.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SomeEvent' },
    })

    const result = detectPublishConnections([event], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })

  it('throws ConnectionDetectionError in strict mode when publishedEventType matches no event', () => {
    const publisher = buildComponent('publishMissing', '/src/strict.ts', 1, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'NonExistentEvent' },
    })

    expect(() =>
      detectPublishConnections([publisher], {
        strict: true,
        repository: 'test-repo',
      }),
    ).toThrow(expect.objectContaining({ message: expect.stringContaining('NonExistentEvent') }))
  })

  it('returns uncertain link in lenient mode when publishedEventType matches no event', () => {
    const publisher = buildComponent('publishNoMatch', '/src/lenient.ts', 1, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'MissingEvent' },
    })

    const result = detectPublishConnections([publisher], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventPublisher:publishNoMatch',
        target: '_unresolved',
        type: 'async',
        _uncertain: expect.stringContaining('MissingEvent'),
      }),
    ])
  })

  it('throws ConnectionDetectionError in strict mode when publishedEventType matches multiple events', () => {
    const event1 = buildComponent('AmbigEventA', '/src/ambig-a.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedName' },
    })
    const event2 = buildComponent('AmbigEventB', '/src/ambig-b.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedName' },
    })
    const publisher = buildComponent('publishAmbig', '/src/ambig.ts', 1, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'SharedName' },
    })

    expect(() =>
      detectPublishConnections([event1, event2, publisher], {
        strict: true,
        repository: 'test-repo',
      }),
    ).toThrow(expect.objectContaining({ message: expect.stringContaining('ambiguous') }))
  })

  it('returns uncertain link in lenient mode when publishedEventType matches multiple events', () => {
    const event1 = buildComponent('AmbigA', '/src/ambig-len-a.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedLenient' },
    })
    const event2 = buildComponent('AmbigB', '/src/ambig-len-b.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedLenient' },
    })
    const publisher = buildComponent('publishAmbigLenient', '/src/ambig-len.ts', 1, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'SharedLenient' },
    })

    const result = detectPublishConnections([event1, event2, publisher], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventPublisher:publishAmbigLenient',
        target: '_unresolved',
        type: 'async',
        _uncertain: expect.stringContaining('ambiguous'),
      }),
    ])
  })

  it('throws ConnectionDetectionError in strict mode when publishedEventType metadata is missing', () => {
    const publisher = buildComponent('NoMetaPublisher', '/src/no-meta.ts', 1, {
      type: 'eventPublisher',
      metadata: {},
    })

    expect(() =>
      detectPublishConnections([publisher], {
        strict: true,
        repository: 'test-repo',
      }),
    ).toThrow(expect.objectContaining({ message: expect.stringContaining('publishedEventType') }))
  })

  it('returns uncertain link in lenient mode when publishedEventType metadata is missing', () => {
    const publisher = buildComponent('NoMetaPublisher', '/src/no-meta-lenient.ts', 1, {
      type: 'eventPublisher',
      metadata: {},
    })

    const result = detectPublishConnections([publisher], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventPublisher:NoMetaPublisher',
        target: '_unresolved',
        type: 'async',
        _uncertain: expect.stringContaining('missing required "publishedEventType" metadata'),
      }),
    ])
  })

  it('includes sourceLocation with publisher file and line', () => {
    const event = buildComponent('LocEvent', '/src/loc-event.ts', 2, {
      type: 'event',
      metadata: { eventName: 'LocEvent' },
    })
    const publisher = buildComponent('LocPublisher', '/src/loc-pub.ts', 10, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'LocEvent' },
    })

    const result = detectPublishConnections([event, publisher], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result[0]?.sourceLocation).toStrictEqual(
      expect.objectContaining({
        repository: 'test-repo',
        filePath: '/src/loc-pub.ts',
        lineNumber: 10,
      }),
    )
  })

  it('uses exact case-sensitive matching for publishedEventType to eventName', () => {
    const event = buildComponent('OrderPlaced', '/src/case-event.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const publisher = buildComponent('CasePublisher', '/src/case-pub.ts', 1, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'orderplaced' },
    })

    const result = detectPublishConnections([event, publisher], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([
      expect.objectContaining({ _uncertain: expect.stringContaining('orderplaced') }),
    ])
  })
})
