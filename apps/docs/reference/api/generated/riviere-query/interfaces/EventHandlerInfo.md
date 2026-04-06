---
pageClass: reference
---

# Interface: EventHandlerInfo

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:121](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L121)

Information about an event handler component.

## Riviere-role

query-model

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:127](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L127)

The domain containing the handler.

***

### handlerName

> **handlerName**: `string` & `$brand`\<`"HandlerName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:125](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L125)

The handler's name.

***

### id

> **id**: `string` & `$brand`\<`"HandlerId"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:123](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L123)

The handler's component ID.

***

### subscribedEvents

> **subscribedEvents**: `string` & `$brand`\<`"EventName"`\>[]

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:129](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L129)

List of event names this handler subscribes to.

***

### subscribedEventsWithDomain

> **subscribedEventsWithDomain**: [`SubscribedEventWithDomain`](../type-aliases/SubscribedEventWithDomain.md)[]

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:131](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L131)

Subscribed events with source domain information.
