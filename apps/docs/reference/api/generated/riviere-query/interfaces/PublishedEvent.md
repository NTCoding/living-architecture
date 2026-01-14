# Interface: PublishedEvent

Defined in: [packages/riviere-query/src/event-types.ts:72](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L72)

A published event with its subscribers.

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:78](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L78)

The domain that publishes the event.

***

### eventName

> **eventName**: `string` & `$brand`\<`"EventName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:76](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L76)

The event name.

***

### handlers

> **handlers**: [`EventSubscriber`](EventSubscriber.md)[]

Defined in: [packages/riviere-query/src/event-types.ts:80](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L80)

Event handlers subscribed to this event.

***

### id

> **id**: `string` & `$brand`\<`"EventId"`\>

Defined in: [packages/riviere-query/src/event-types.ts:74](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L74)

The event component's ID.
