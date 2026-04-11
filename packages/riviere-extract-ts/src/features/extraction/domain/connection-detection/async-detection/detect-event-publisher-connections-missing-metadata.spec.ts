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

describe('detectEventPublisherConnections — missing/invalid metadata', () => {
  it('returns uncertain link in lenient mode when metadataKey is missing from metadata', () => {
    const publisher = buildComponent('NoMetaSender', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: {},
    })

    const result = detectEventPublisherConnections(
      [publisher],
      eventPublisherConfig(),
      defaultOptions,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:eventSender:NoMetaSender',
        target: '_unresolved',
        _uncertain: expect.stringContaining('"publishedEventType" metadata'),
      }),
    ])
  })

  it('throws ConnectionDetectionError in strict mode when metadataKey is missing', () => {
    const publisher = buildComponent('StrictNoMeta', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: {},
    })
    const config = eventPublisherConfig()
    const act = () =>
      detectEventPublisherConnections([publisher], config, {
        strict: true,
        repository: 'test-repo',
      })
    expect(act).toThrow(ConnectionDetectionError)
    expect(act).toThrow(
      expect.objectContaining({ message: expect.stringContaining('"publishedEventType"') }),
    )
  })

  it('returns uncertain link in lenient mode when metadataKey value is empty string', () => {
    const publisher = buildComponent('EmptySender', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: { publishedEventType: '' },
    })

    const result = detectEventPublisherConnections(
      [publisher],
      eventPublisherConfig(),
      defaultOptions,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        target: '_unresolved',
        _uncertain: expect.stringContaining('"publishedEventType" metadata'),
      }),
    ])
  })

  it('returns uncertain link in lenient mode when metadataKey value is non-string type', () => {
    const publisher = buildComponent('NumericSender', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: { publishedEventType: 42 },
    })

    const result = detectEventPublisherConnections(
      [publisher],
      eventPublisherConfig(),
      defaultOptions,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        target: '_unresolved',
        _uncertain: expect.stringContaining('"publishedEventType" metadata'),
      }),
    ])
  })

  it('returns uncertain link in lenient mode when array metadataKey contains only empty strings', () => {
    const publisher = buildComponent('EmptyArraySender', '/src/sender.ts', 1, {
      type: 'eventSender',
      metadata: { publishedEventType: ['', '  '] },
    })

    const result = detectEventPublisherConnections(
      [publisher],
      eventPublisherConfig(),
      defaultOptions,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        target: '_unresolved',
        _uncertain: expect.stringContaining('"publishedEventType" metadata'),
      }),
    ])
  })
})
