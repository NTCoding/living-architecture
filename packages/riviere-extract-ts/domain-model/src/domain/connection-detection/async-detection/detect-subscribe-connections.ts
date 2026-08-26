import {
  EVENT_NAME_FIELD,
  SUBSCRIBED_EVENTS_FIELD,
} from '@living-architecture/riviere-schema-published-language/schema'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import { ConnectionDetectionError } from '../connection-detection-error'
import { ExtractedLink } from '../extracted-link'
import { TypeScriptSourceLocation } from '../typescript-source-location'
import type { AsyncDetectionOptions } from './async-detection-options'

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function detectSubscribeConnections(
  components: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
): ExtractedLink[] {
  const eventHandlers = components.filter((c) => c.type === 'eventHandler')
  const events = components.filter((c) => c.type === 'event')
  const repository = options.repository

  return eventHandlers.flatMap((handler) =>
    getSubscribedEvents(handler).flatMap((eventName) =>
      resolveSubscription(handler, eventName, events, options, repository),
    ),
  )
}

function resolveSubscription(
  handler: EnrichedComponent,
  eventName: string,
  events: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
  repository: string,
): ExtractedLink[] {
  const matchingEvents = events.filter((e) => e.metadata[EVENT_NAME_FIELD] === eventName)

  if (matchingEvents.length === 0) {
    return [handleNoMatch(handler, eventName, options, repository)]
  }

  if (matchingEvents.length > 1) {
    return [handleAmbiguousMatch(handler, eventName, matchingEvents.length, options, repository)]
  }

  return matchingEvents.map((event) =>
    ExtractedLink.parse({
      source: ComponentId.parseFromParts(event).toString(),
      target: ComponentId.parseFromParts(handler).toString(),
      type: 'async',
      sourceLocation: TypeScriptSourceLocation.parseFromComponent(
        repository,
        handler,
      ).toPublishedSourceLocation(),
    }),
  )
}

function handleAmbiguousMatch(
  handler: EnrichedComponent,
  eventName: string,
  matchCount: number,
  options: AsyncDetectionOptions,
  repository: string,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: handler.location.file,
      line: handler.location.line,
      typeName: handler.name,
      reason: `subscribed event "${eventName}" matches ${matchCount} Event components (ambiguous)`,
    })
  }
  return ExtractedLink.parse({
    source: '_unresolved',
    target: ComponentId.parseFromParts(handler).toString(),
    type: 'async',
    sourceLocation: TypeScriptSourceLocation.parseFromComponent(
      repository,
      handler,
    ).toPublishedSourceLocation(),
    _uncertain: `ambiguous: ${matchCount} events match subscribed event name: ${eventName}`,
  })
}

function handleNoMatch(
  handler: EnrichedComponent,
  eventName: string,
  options: AsyncDetectionOptions,
  repository: string,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: handler.location.file,
      line: handler.location.line,
      typeName: handler.name,
      reason: `subscribed event "${eventName}" does not match any Event component`,
    })
  }
  return ExtractedLink.parse({
    source: '_unresolved',
    target: ComponentId.parseFromParts(handler).toString(),
    type: 'async',
    sourceLocation: TypeScriptSourceLocation.parseFromComponent(
      repository,
      handler,
    ).toPublishedSourceLocation(),
    _uncertain: `no event found for subscribed event name: ${eventName}`,
  })
}

function getSubscribedEvents(handler: EnrichedComponent): string[] {
  const raw = handler.metadata[SUBSCRIBED_EVENTS_FIELD]
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter((item): item is string => typeof item === 'string')
}
