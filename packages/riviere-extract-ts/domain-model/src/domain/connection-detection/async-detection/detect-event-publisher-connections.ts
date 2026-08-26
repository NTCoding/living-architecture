import type { EventPublisherConfig } from '@living-architecture/riviere-extract-config-published-language'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import { EVENT_NAME_FIELD } from '@living-architecture/riviere-schema-published-language/schema'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import { ConnectionDetectionError } from '../connection-detection-error'
import { ExtractedLink } from '../extracted-link'
import { TypeScriptSourceLocation } from '../typescript-source-location'
import type { AsyncDetectionOptions } from './async-detection-options'

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
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
    const { fromType, metadataKey } = publisherConfig
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
  return ExtractedLink.parse({
    source: ComponentId.parseFromParts(publisher).toString(),
    target: '_unresolved',
    type: 'async',
    sourceLocation: TypeScriptSourceLocation.parseFromComponent(
      options.repository,
      publisher,
    ).toPublishedSourceLocation(),
    _uncertain: `event publisher "${publisher.name}" is missing required "${metadataKey}" metadata`,
  })
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

  return matchingEvents.map((event) =>
    ExtractedLink.parse({
      source: ComponentId.parseFromParts(publisher).toString(),
      target: ComponentId.parseFromParts(event).toString(),
      type: 'async',
      sourceLocation: TypeScriptSourceLocation.parseFromComponent(
        options.repository,
        publisher,
      ).toPublishedSourceLocation(),
    }),
  )
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
  return ExtractedLink.parse({
    source: ComponentId.parseFromParts(publisher).toString(),
    target: '_unresolved',
    type: 'async',
    sourceLocation: TypeScriptSourceLocation.parseFromComponent(
      options.repository,
      publisher,
    ).toPublishedSourceLocation(),
    _uncertain: `ambiguous: ${matchCount} events match published event type: ${publishedEventType}`,
  })
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
  return ExtractedLink.parse({
    source: ComponentId.parseFromParts(publisher).toString(),
    target: '_unresolved',
    type: 'async',
    sourceLocation: TypeScriptSourceLocation.parseFromComponent(
      options.repository,
      publisher,
    ).toPublishedSourceLocation(),
    _uncertain: `no event found for published event type: ${publishedEventType}`,
  })
}
