import type { SourceLocation } from '@living-architecture/riviere-schema-published-language/schema'

export interface EventSubscriber {
  handlerId: string
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
