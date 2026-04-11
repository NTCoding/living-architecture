import type { EventPublisherConfig } from '@living-architecture/riviere-extract-config'
import type { SourceLocation } from '@living-architecture/riviere-schema'
import { EVENT_NAME_FIELD } from '@living-architecture/riviere-schema'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type { ExtractedLink } from '../extracted-link'
import { ConnectionDetectionError } from '../connection-detection-error'
import { componentIdentity } from '../call-graph/call-graph-types'
import type { AsyncDetectionOptions } from './detect-subscribe-connections'

type RequiredLineLocation = SourceLocation & { lineNumber: number }

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
  const repository = options.repository

  return eventPublishers.flatMap((publisherConfig) => {
    const {
      fromType, metadataKey 
    } = publisherConfig
    const publishers = components.filter((c) => c.type === fromType)
    return publishers.flatMap((publisher) => {
      const publishedEventType = publisher.metadata[metadataKey]
      const sourceLocation: RequiredLineLocation = {
        repository,
        filePath: publisher.location.file,
        lineNumber: publisher.location.line,
      }

      if (typeof publishedEventType !== 'string') {
        return [handleMissingMetadata(publisher, metadataKey, options, sourceLocation)]
      }

      return resolvePublishTarget(publisher, publishedEventType, events, options, sourceLocation)
    })
  })
}

function handleMissingMetadata(
  publisher: EnrichedComponent,
  metadataKey: string,
  options: AsyncDetectionOptions,
  sourceLocation: RequiredLineLocation,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: sourceLocation.filePath,
      line: sourceLocation.lineNumber,
      typeName: publisher.name,
      reason: `event publisher is missing required "${metadataKey}" metadata`,
    })
  }
  return {
    source: componentIdentity(publisher),
    target: '_unresolved',
    type: 'async',
    sourceLocation,
    _uncertain: `event publisher "${publisher.name}" is missing required "${metadataKey}" metadata`,
  }
}

function resolvePublishTarget(
  publisher: EnrichedComponent,
  publishedEventType: string,
  events: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
  sourceLocation: RequiredLineLocation,
): ExtractedLink[] {
  const matchingEvents = events.filter((e) => e.metadata[EVENT_NAME_FIELD] === publishedEventType)

  if (matchingEvents.length === 0) {
    return [handleNoMatch(publisher, publishedEventType, options, sourceLocation)]
  }

  if (matchingEvents.length > 1) {
    return [
      handleAmbiguousMatch(
        publisher,
        publishedEventType,
        matchingEvents.length,
        options,
        sourceLocation,
      ),
    ]
  }

  return matchingEvents.map((event) => ({
    source: componentIdentity(publisher),
    target: componentIdentity(event),
    type: 'async' as const,
    sourceLocation,
  }))
}

function handleAmbiguousMatch(
  publisher: EnrichedComponent,
  publishedEventType: string,
  matchCount: number,
  options: AsyncDetectionOptions,
  sourceLocation: RequiredLineLocation,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: sourceLocation.filePath,
      line: sourceLocation.lineNumber,
      typeName: publisher.name,
      reason: `"${publishedEventType}" matches ${matchCount} Event components (ambiguous)`,
    })
  }
  return {
    source: componentIdentity(publisher),
    target: '_unresolved',
    type: 'async',
    sourceLocation,
    _uncertain: `ambiguous: ${matchCount} events match published event type: ${publishedEventType}`,
  }
}

function handleNoMatch(
  publisher: EnrichedComponent,
  publishedEventType: string,
  options: AsyncDetectionOptions,
  sourceLocation: RequiredLineLocation,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: sourceLocation.filePath,
      line: sourceLocation.lineNumber,
      typeName: publisher.name,
      reason: `"${publishedEventType}" does not match any Event component`,
    })
  }
  return {
    source: componentIdentity(publisher),
    target: '_unresolved',
    type: 'async',
    sourceLocation,
    _uncertain: `no event found for published event type: ${publishedEventType}`,
  }
}
