import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type {
  PublishedEvent, EventHandlerInfo 
} from './event-types'
import {
  queryPublishedEvents, queryEventHandlers 
} from './event-queries'

export class EventQueries {
  constructor(private readonly graph: RiviereGraph) {}

  publishedEvents(domainName?: string): PublishedEvent[] {
    return queryPublishedEvents(this.graph, domainName)
  }

  handlers(eventName?: string): EventHandlerInfo[] {
    return queryEventHandlers(this.graph, eventName)
  }
}
