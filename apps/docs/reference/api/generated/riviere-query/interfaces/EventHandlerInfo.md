# Interface: EventHandlerInfo

Defined in: [packages/riviere-query/src/event-types.ts:113](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L113)

Information about an event handler component.

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:119](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L119)

The domain containing the handler.

***

### handlerName

> **handlerName**: `string` & `$brand`\<`"HandlerName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:117](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L117)

The handler's name.

***

### id

> **id**: `string` & `$brand`\<`"HandlerId"`\>

Defined in: [packages/riviere-query/src/event-types.ts:115](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L115)

The handler's component ID.

***

### subscribedEvents

> **subscribedEvents**: `string` & `$brand`\<`"EventName"`\>[]

Defined in: [packages/riviere-query/src/event-types.ts:121](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L121)

List of event names this handler subscribes to.

***

### subscribedEventsWithDomain

> **subscribedEventsWithDomain**: [`SubscribedEventWithDomain`](../type-aliases/SubscribedEventWithDomain.md)[]

Defined in: [packages/riviere-query/src/event-types.ts:123](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L123)

Subscribed events with source domain information.
