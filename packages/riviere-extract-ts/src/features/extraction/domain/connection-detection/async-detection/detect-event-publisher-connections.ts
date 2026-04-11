import type { EventPublisherConfig } from '@living-architecture/riviere-extract-config'
import { EVENT_NAME_FIELD } from '@living-architecture/riviere-schema'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type { ExtractedLink } from '../extracted-link'
import { ConnectionDetectionError } from '../connection-detection-error'
import { componentIdentity } from '../call-graph/call-graph-types'
import type { AsyncDetectionOptions } from './async-detection-types'
import { toSourceLocation } from './async-detection-types'

/** @riviere-role domain-service */
export function detectEventPublisherConnections(
  components: readonly EnrichedComponent[],
  eventPublishers: readonly EventPublisherConfig[],
  options: AsyncDetectionOptions,
): ExtractedLink[] {
  if (eventPublishers.length === 0) {
    return []
  }

  const events = components.filter((c) => c.type === 'event')

  return eventPublishers.flatMap((publisherConfig) => {
    const {
      fromType, metadataKey 
    } = publisherConfig
    const publishers = components.filter((c) => c.type === fromType)
    return publishers.flatMap((publisher) => {
      const publishedEventType = publisher.metadata[metadataKey]

      if (Array.isArray(publishedEventType)) {
        const validTypes = publishedEventType.filter(
          (t): t is string => typeof t === 'string' && t.trim() !== '',
        )
        if (validTypes.length === 0) {
          return [handleMissingMetadata(publisher, metadataKey, options)]
        }
        return validTypes.flatMap((t) => resolvePublishTarget(publisher, t, events, options))
      }

      if (typeof publishedEventType !== 'string' || publishedEventType.trim() === '') {
        return [handleMissingMetadata(publisher, metadataKey, options)]
      }

      return resolvePublishTarget(publisher, publishedEventType, events, options)
    })
  })
}

function handleMissingMetadata(
  publisher: EnrichedComponent,
  metadataKey: string,
  options: AsyncDetectionOptions,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: publisher.location.file,
      line: publisher.location.line,
      typeName: publisher.name,
      reason: `published event type in "${metadataKey}" metadata is missing or invalid`,
    })
  }
  return {
    source: componentIdentity(publisher),
    target: '_unresolved',
    type: 'async',
    sourceLocation: toSourceLocation(publisher, options.repository),
    _uncertain: `event publisher "${publisher.name}" is missing required "${metadataKey}" metadata`,
  }
}

function resolvePublishTarget(
  publisher: EnrichedComponent,
  publishedEventType: string,
  events: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
): ExtractedLink[] {
  const matchingEvents = events.filter((e) => e.metadata[EVENT_NAME_FIELD] === publishedEventType)

  if (matchingEvents.length === 0) {
    return [handleNoMatch(publisher, publishedEventType, options)]
  }

  if (matchingEvents.length > 1) {
    return [handleAmbiguousMatch(publisher, publishedEventType, matchingEvents.length, options)]
  }

  return matchingEvents.map((event) => ({
    source: componentIdentity(publisher),
    target: componentIdentity(event),
    type: 'async' as const,
    sourceLocation: toSourceLocation(publisher, options.repository),
  }))
}

function handleAmbiguousMatch(
  publisher: EnrichedComponent,
  publishedEventType: string,
  matchCount: number,
  options: AsyncDetectionOptions,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: publisher.location.file,
      line: publisher.location.line,
      typeName: publisher.name,
      reason: `published event "${publishedEventType}" matches ${matchCount} Event components (ambiguous)`,
    })
  }
  return {
    source: componentIdentity(publisher),
    target: '_unresolved',
    type: 'async',
    sourceLocation: toSourceLocation(publisher, options.repository),
    _uncertain: `ambiguous: ${matchCount} events match published event type: ${publishedEventType}`,
  }
}

function handleNoMatch(
  publisher: EnrichedComponent,
  publishedEventType: string,
  options: AsyncDetectionOptions,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: publisher.location.file,
      line: publisher.location.line,
      typeName: publisher.name,
      reason: `published event "${publishedEventType}" does not match any Event component`,
    })
  }
  return {
    source: componentIdentity(publisher),
    target: '_unresolved',
    type: 'async',
    sourceLocation: toSourceLocation(publisher, options.repository),
    _uncertain: `no event found for published event type: ${publishedEventType}`,
  }
}
