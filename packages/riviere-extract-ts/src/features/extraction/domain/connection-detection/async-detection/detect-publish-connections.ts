import type { SourceLocation } from '@living-architecture/riviere-schema'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type { ExtractedLink } from '../extracted-link'
import { ConnectionDetectionError } from '../connection-detection-error'
import { componentIdentity } from '../call-graph/call-graph-types'
import type { AsyncDetectionOptions } from './detect-subscribe-connections'

type RequiredLineLocation = SourceLocation & { lineNumber: number }

export function detectPublishConnections(
  components: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
): ExtractedLink[] {
  const publishers = components.filter((c) => c.type === 'eventPublisher')
  const events = components.filter((c) => c.type === 'event')
  const repository = options.repository

  return publishers.flatMap((publisher) => {
    const publishedEventType = publisher.metadata['publishedEventType']
    const sourceLocation: RequiredLineLocation = {
      repository,
      filePath: publisher.location.file,
      lineNumber: publisher.location.line,
    }

    if (typeof publishedEventType !== 'string') {
      return [handleMissingMetadata(publisher, options, sourceLocation)]
    }

    return resolvePublishTarget(publisher, publishedEventType, events, options, sourceLocation)
  })
}

function handleMissingMetadata(
  publisher: EnrichedComponent,
  options: AsyncDetectionOptions,
  sourceLocation: RequiredLineLocation,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: sourceLocation.filePath,
      line: sourceLocation.lineNumber,
      typeName: publisher.name,
      reason: 'eventPublisher is missing required "publishedEventType" metadata',
    })
  }
  return {
    source: componentIdentity(publisher),
    target: '_unresolved',
    type: 'async',
    sourceLocation,
    _uncertain: `eventPublisher "${publisher.name}" is missing required "publishedEventType" metadata`,
  }
}

function resolvePublishTarget(
  publisher: EnrichedComponent,
  publishedEventType: string,
  events: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
  sourceLocation: RequiredLineLocation,
): ExtractedLink[] {
  const matchingEvents = events.filter((e) => e.metadata['eventName'] === publishedEventType)

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
      reason: `publishedEventType "${publishedEventType}" matches ${matchCount} Event components (ambiguous)`,
    })
  }
  return {
    source: componentIdentity(publisher),
    target: '_unresolved',
    type: 'async',
    sourceLocation,
    _uncertain: `ambiguous: ${matchCount} events match publishedEventType: ${publishedEventType}`,
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
      reason: `publishedEventType "${publishedEventType}" does not match any Event component`,
    })
  }
  return {
    source: componentIdentity(publisher),
    target: '_unresolved',
    type: 'async',
    sourceLocation,
    _uncertain: `no event found for publishedEventType: ${publishedEventType}`,
  }
}
