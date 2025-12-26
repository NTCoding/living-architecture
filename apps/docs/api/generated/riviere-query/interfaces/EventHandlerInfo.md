# Interface: EventHandlerInfo

Defined in: [event-types.ts:93](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/event-types.ts#L93)

Information about an event handler component.

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [event-types.ts:99](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/event-types.ts#L99)

The domain containing the handler.

***

### handlerName

> **handlerName**: `string` & `$brand`\<`"HandlerName"`\>

Defined in: [event-types.ts:97](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/event-types.ts#L97)

The handler's name.

***

### id

> **id**: `string` & `$brand`\<`"HandlerId"`\>

Defined in: [event-types.ts:95](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/event-types.ts#L95)

The handler's component ID.

***

### subscribedEvents

> **subscribedEvents**: `string` & `$brand`\<`"EventName"`\>[]

Defined in: [event-types.ts:101](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/event-types.ts#L101)

List of event names this handler subscribes to.

***

### subscribedEventsWithDomain

> **subscribedEventsWithDomain**: [`SubscribedEventWithDomain`](../type-aliases/SubscribedEventWithDomain.md)[]

Defined in: [event-types.ts:103](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/event-types.ts#L103)

Subscribed events with source domain information.
