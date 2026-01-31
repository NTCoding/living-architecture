import type { SourceLocation } from '@living-architecture/riviere-schema'

export interface EventSubscriber {
  domain: string
  handlerName: string
}

export interface DomainEvent {
  id: string
  eventName: string
  schema: string | undefined
  sourceLocation: SourceLocation | undefined
  handlers: EventSubscriber[]
}
