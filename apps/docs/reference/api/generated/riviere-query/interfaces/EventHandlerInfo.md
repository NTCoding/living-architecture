---
pageClass: reference
---

# Interface: EventHandlerInfo

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:98](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L98)

Information about an event handler component.

## Riviere-role

value-object

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:104](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L104)

The domain containing the handler.

***

### handlerName

> **handlerName**: `string` & `$brand`\<`"HandlerName"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:102](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L102)

The handler's name.

***

### id

> **id**: `string` & `$brand`\<`"HandlerId"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:100](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L100)

The handler's component ID.

***

### subscribedEvents

> **subscribedEvents**: `string` & `$brand`\<`"EventName"`\>[]

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:106](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L106)

List of event names this handler subscribes to.

***

### subscribedEventsWithDomain

> **subscribedEventsWithDomain**: [`SubscribedEventWithDomain`](../type-aliases/SubscribedEventWithDomain.md)[]

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:108](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L108)

Subscribed events with source domain information.
