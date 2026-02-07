import {
  describe, it, expect 
} from 'vitest'
import { detectPublishConnections } from './detect-publish-connections'
import {
  sharedProject, nextFile, buildComponent 
} from '../call-graph/call-graph-fixtures'
import { ConnectionDetectionError } from '../connection-detection-error'

describe('detectPublishConnections', () => {
  it('returns async link from publisher method to Event when parameter type matches eventName', () => {
    const filePath = nextFile(`
class OrderPlacedEvent {}

class OrderPublisher {
  publishOrderPlaced(event: OrderPlacedEvent): void {}
}
`)
    const event = buildComponent('OrderPlacedEvent', filePath, 2, {
      type: 'event',
      metadata: { eventName: 'OrderPlacedEvent' },
    })
    const publisher = buildComponent('OrderPublisher', filePath, 4, {
      type: 'eventPublisher',
      metadata: {},
    })

    const result = detectPublishConnections(sharedProject, [event, publisher], { strict: false })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventPublisher:OrderPublisher',
        target: 'orders:event:OrderPlacedEvent',
        type: 'async',
      }),
    ])
  })

  it('returns multiple links when publisher has multiple methods with different events', () => {
    const filePath = nextFile(`
class OrderPlacedEvent {}
class OrderShippedEvent {}

class OrderPublisher {
  publishPlaced(event: OrderPlacedEvent): void {}
  publishShipped(event: OrderShippedEvent): void {}
}
`)
    const event1 = buildComponent('OrderPlacedEvent', filePath, 2, {
      type: 'event',
      metadata: { eventName: 'OrderPlacedEvent' },
    })
    const event2 = buildComponent('OrderShippedEvent', filePath, 3, {
      type: 'event',
      metadata: { eventName: 'OrderShippedEvent' },
    })
    const publisher = buildComponent('OrderPublisher', filePath, 5, {
      type: 'eventPublisher',
      metadata: {},
    })

    const result = detectPublishConnections(sharedProject, [event1, event2, publisher], {strict: false,})

    expect(result).toHaveLength(2)
  })

  it('returns empty array when components list is empty', () => {
    const result = detectPublishConnections(sharedProject, [], { strict: false })
    expect(result).toStrictEqual([])
  })

  it('returns empty array when no eventPublisher components exist', () => {
    const event = buildComponent('SomeEvent', '/src/no-pub.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SomeEvent' },
    })

    const result = detectPublishConnections(sharedProject, [event], { strict: false })

    expect(result).toStrictEqual([])
  })

  it('uses publishedEventType metadata to resolve event when present', () => {
    const filePath = nextFile(`
class MetaEvent {}
`)
    const event = buildComponent('MetaEvent', filePath, 2, {
      type: 'event',
      metadata: { eventName: 'MetaEvent' },
    })
    const publisher = buildComponent('publishMeta', '/src/meta-pub.ts', 5, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'MetaEvent' },
    })

    const result = detectPublishConnections(sharedProject, [event, publisher], { strict: false })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventPublisher:publishMeta',
        target: 'orders:event:MetaEvent',
        type: 'async',
      }),
    ])
  })

  it('throws ConnectionDetectionError in strict mode when metadata publishedEventType matches no Event', () => {
    const publisher = buildComponent('publishMissing', '/src/meta-strict.ts', 1, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'NonExistentEvent' },
    })

    expect(() => detectPublishConnections(sharedProject, [publisher], { strict: true })).toThrow(
      ConnectionDetectionError,
    )
  })

  it('returns uncertain link in lenient mode when metadata publishedEventType matches no Event', () => {
    const publisher = buildComponent('publishNoMatch', '/src/meta-lenient.ts', 1, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'MissingEvent' },
    })

    const result = detectPublishConnections(sharedProject, [publisher], { strict: false })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventPublisher:publishNoMatch',
        target: '_unresolved',
        type: 'async',
        _uncertain: expect.stringContaining('MissingEvent'),
      }),
    ])
  })

  it('throws ConnectionDetectionError in strict mode when metadata publishedEventType matches multiple Events', () => {
    const event1 = buildComponent('AmbigMetaEventA', '/src/ambig-a.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedMetaName' },
    })
    const event2 = buildComponent('AmbigMetaEventB', '/src/ambig-b.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedMetaName' },
    })
    const publisher = buildComponent('publishAmbig', '/src/meta-ambig.ts', 1, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'SharedMetaName' },
    })

    expect(() =>
      detectPublishConnections(sharedProject, [event1, event2, publisher], { strict: true }),
    ).toThrow(ConnectionDetectionError)
  })

  it('returns uncertain link in lenient mode when metadata publishedEventType matches multiple Events', () => {
    const event1 = buildComponent('AmbigMetaA', '/src/ambig-len-a.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedLenientMeta' },
    })
    const event2 = buildComponent('AmbigMetaB', '/src/ambig-len-b.ts', 1, {
      type: 'event',
      metadata: { eventName: 'SharedLenientMeta' },
    })
    const publisher = buildComponent('publishAmbigLenient', '/src/meta-ambig-len.ts', 1, {
      type: 'eventPublisher',
      metadata: { publishedEventType: 'SharedLenientMeta' },
    })

    const result = detectPublishConnections(sharedProject, [event1, event2, publisher], {strict: false,})

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventPublisher:publishAmbigLenient',
        target: '_unresolved',
        type: 'async',
        _uncertain: expect.stringContaining('ambiguous'),
      }),
    ])
  })

  it('returns empty array when publisher has no public methods', () => {
    const filePath = nextFile(`
class EmptyPublisher {}
`)
    const publisher = buildComponent('EmptyPublisher', filePath, 2, {
      type: 'eventPublisher',
      metadata: {},
    })

    const result = detectPublishConnections(sharedProject, [publisher], { strict: false })

    expect(result).toStrictEqual([])
  })

  it('throws ConnectionDetectionError in strict mode when parameter type matches no Event', () => {
    const filePath = nextFile(`
class UnknownEvent {}

class StrictPublisher {
  publish(event: UnknownEvent): void {}
}
`)
    const publisher = buildComponent('StrictPublisher', filePath, 4, {
      type: 'eventPublisher',
      metadata: {},
    })

    expect(() => detectPublishConnections(sharedProject, [publisher], { strict: true })).toThrow(
      ConnectionDetectionError,
    )
  })

  it('returns uncertain link in lenient mode when parameter type matches no Event', () => {
    const filePath = nextFile(`
class NoMatchEvent {}

class LenientPublisher {
  publish(event: NoMatchEvent): void {}
}
`)
    const publisher = buildComponent('LenientPublisher', filePath, 4, {
      type: 'eventPublisher',
      metadata: {},
    })

    const result = detectPublishConnections(sharedProject, [publisher], { strict: false })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventPublisher:LenientPublisher',
        target: '_unresolved',
        type: 'async',
        _uncertain: expect.stringContaining('NoMatchEvent'),
      }),
    ])
  })

  it('throws ConnectionDetectionError in strict mode when parameter type matches multiple Events', () => {
    const filePath = nextFile(`
class DuplicateEvent {}

class AmbiguousPublisher {
  publish(event: DuplicateEvent): void {}
}
`)
    const event1 = buildComponent('DuplicateEventA', filePath, 2, {
      type: 'event',
      metadata: { eventName: 'DuplicateEvent' },
    })
    const event2 = buildComponent('DuplicateEventB', '/src/other.ts', 1, {
      type: 'event',
      metadata: { eventName: 'DuplicateEvent' },
    })
    const publisher = buildComponent('AmbiguousPublisher', filePath, 4, {
      type: 'eventPublisher',
      metadata: {},
    })

    expect(() =>
      detectPublishConnections(sharedProject, [event1, event2, publisher], { strict: true }),
    ).toThrow(ConnectionDetectionError)
  })

  it('returns uncertain link in lenient mode when parameter type matches multiple Events', () => {
    const filePath = nextFile(`
class DupEvent {}

class AmbigPublisher {
  publish(event: DupEvent): void {}
}
`)
    const event1 = buildComponent('DupEventA', filePath, 2, {
      type: 'event',
      metadata: { eventName: 'DupEvent' },
    })
    const event2 = buildComponent('DupEventB', '/src/other2.ts', 1, {
      type: 'event',
      metadata: { eventName: 'DupEvent' },
    })
    const publisher = buildComponent('AmbigPublisher', filePath, 4, {
      type: 'eventPublisher',
      metadata: {},
    })

    const result = detectPublishConnections(sharedProject, [event1, event2, publisher], {strict: false,})

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventPublisher:AmbigPublisher',
        target: '_unresolved',
        type: 'async',
        _uncertain: expect.stringContaining('ambiguous'),
      }),
    ])
  })

  it('includes sourceLocation with filePath and lineNumber of publisher method', () => {
    const filePath = nextFile(`
class LocEvent {}

class LocPublisher {
  publish(event: LocEvent): void {}
}
`)
    const event = buildComponent('LocEvent', filePath, 2, {
      type: 'event',
      metadata: { eventName: 'LocEvent' },
    })
    const publisher = buildComponent('LocPublisher', filePath, 4, {
      type: 'eventPublisher',
      metadata: {},
    })

    const result = detectPublishConnections(sharedProject, [event, publisher], { strict: false })

    expect(result[0]?.sourceLocation).toStrictEqual(
      expect.objectContaining({
        filePath,
        lineNumber: 5,
      }),
    )
  })

  it('uses exact case-sensitive matching for parameter type to eventName', () => {
    const filePath = nextFile(`
class orderplaced {}

class CasePublisher {
  publish(event: orderplaced): void {}
}
`)
    const event = buildComponent('OrderPlaced', filePath, 2, {
      type: 'event',
      metadata: { eventName: 'OrderPlaced' },
    })
    const publisher = buildComponent('CasePublisher', filePath, 4, {
      type: 'eventPublisher',
      metadata: {},
    })

    const result = detectPublishConnections(sharedProject, [event, publisher], { strict: false })

    expect(result).toStrictEqual([
      expect.objectContaining({ _uncertain: expect.stringContaining('orderplaced') }),
    ])
  })

  it('returns empty array when publisher class is not found in project', () => {
    const publisher = buildComponent('GhostPublisher', '/src/ghost.ts', 1, {
      type: 'eventPublisher',
      metadata: {},
    })

    const result = detectPublishConnections(sharedProject, [publisher], { strict: false })

    expect(result).toStrictEqual([])
  })

  it('skips methods with no parameters', () => {
    const filePath = nextFile(`
class NoParamPublisher {
  publish(): void {}
}
`)
    const publisher = buildComponent('NoParamPublisher', filePath, 2, {
      type: 'eventPublisher',
      metadata: {},
    })

    const result = detectPublishConnections(sharedProject, [publisher], { strict: false })

    expect(result).toStrictEqual([])
  })

  it('uses first parameter type for matching', () => {
    const filePath = nextFile(`
class FirstParamEvent {}

class MultiParamPublisher {
  publish(event: FirstParamEvent, extra: string): void {}
}
`)
    const event = buildComponent('FirstParamEvent', filePath, 2, {
      type: 'event',
      metadata: { eventName: 'FirstParamEvent' },
    })
    const publisher = buildComponent('MultiParamPublisher', filePath, 4, {
      type: 'eventPublisher',
      metadata: {},
    })

    const result = detectPublishConnections(sharedProject, [event, publisher], { strict: false })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventPublisher:MultiParamPublisher',
        target: 'orders:event:FirstParamEvent',
        type: 'async',
      }),
    ])
  })
})
