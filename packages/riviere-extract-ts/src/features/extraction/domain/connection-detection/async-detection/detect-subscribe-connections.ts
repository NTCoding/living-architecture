import type { SourceLocation } from '@living-architecture/riviere-schema'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type { ExtractedLink } from '../extracted-link'
import { ConnectionDetectionError } from '../connection-detection-error'
import { componentIdentity } from '../call-graph/call-graph-types'

export interface AsyncDetectionOptions {strict: boolean}

export function detectSubscribeConnections(
  components: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
): ExtractedLink[] {
  const eventHandlers = components.filter((c) => c.type === 'eventHandler')
  const events = components.filter((c) => c.type === 'event')

  return eventHandlers.flatMap((handler) =>
    getSubscribedEvents(handler).flatMap((eventName) =>
      resolveSubscription(handler, eventName, events, options),
    ),
  )
}

function toSourceLocation(component: EnrichedComponent): SourceLocation {
  return {
    repository: '',
    filePath: component.location.file,
    lineNumber: component.location.line,
  }
}

function resolveSubscription(
  handler: EnrichedComponent,
  eventName: string,
  events: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
): ExtractedLink[] {
  const matchingEvents = events.filter((e) => e.metadata['eventName'] === eventName)

  if (matchingEvents.length === 0) {
    return [handleNoMatch(handler, eventName, options)]
  }

  if (matchingEvents.length > 1) {
    return [handleAmbiguousMatch(handler, eventName, matchingEvents.length, options)]
  }

  return matchingEvents.map((event) => ({
    source: componentIdentity(event),
    target: componentIdentity(handler),
    type: 'async',
    sourceLocation: toSourceLocation(handler),
  }))
}

function handleAmbiguousMatch(
  handler: EnrichedComponent,
  eventName: string,
  matchCount: number,
  options: AsyncDetectionOptions,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: handler.location.file,
      line: handler.location.line,
      typeName: handler.name,
      reason: `subscribed event "${eventName}" matches ${matchCount} Event components (ambiguous)`,
    })
  }
  return {
    source: '_unresolved',
    target: componentIdentity(handler),
    type: 'async',
    sourceLocation: toSourceLocation(handler),
    _uncertain: `ambiguous: ${matchCount} events match subscribed event name: ${eventName}`,
  }
}

function handleNoMatch(
  handler: EnrichedComponent,
  eventName: string,
  options: AsyncDetectionOptions,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: handler.location.file,
      line: handler.location.line,
      typeName: handler.name,
      reason: `subscribed event "${eventName}" does not match any Event component`,
    })
  }
  return {
    source: '_unresolved',
    target: componentIdentity(handler),
    type: 'async',
    sourceLocation: toSourceLocation(handler),
    _uncertain: `no event found for subscribed event name: ${eventName}`,
  }
}

function getSubscribedEvents(handler: EnrichedComponent): string[] {
  const raw = handler.metadata['subscribedEvents']
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter((item): item is string => typeof item === 'string')
}
