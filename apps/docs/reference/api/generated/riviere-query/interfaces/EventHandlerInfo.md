---
pageClass: reference
---

# Interface: EventHandlerInfo

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:114](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L114)

Information about an event handler component.

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:120](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L120)

The domain containing the handler.

***

### handlerName

> **handlerName**: `string` & `$brand`\<`"HandlerName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:118](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L118)

The handler's name.

***

### id

> **id**: `string` & `$brand`\<`"HandlerId"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:116](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L116)

The handler's component ID.

***

### subscribedEvents

> **subscribedEvents**: `string` & `$brand`\<`"EventName"`\>[]

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:122](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L122)

List of event names this handler subscribes to.

***

### subscribedEventsWithDomain

> **subscribedEventsWithDomain**: [`SubscribedEventWithDomain`](../type-aliases/SubscribedEventWithDomain.md)[]

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:124](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L124)

Subscribed events with source domain information.
