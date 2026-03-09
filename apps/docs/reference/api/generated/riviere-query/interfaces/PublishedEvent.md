---
pageClass: reference
---

# Interface: PublishedEvent

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:73](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L73)

A published event with its subscribers.

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:79](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L79)

The domain that publishes the event.

***

### eventName

> **eventName**: `string` & `$brand`\<`"EventName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:77](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L77)

The event name.

***

### handlers

> **handlers**: [`EventSubscriber`](EventSubscriber.md)[]

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:81](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L81)

Event handlers subscribed to this event.

***

### id

> **id**: `string` & `$brand`\<`"EventId"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:75](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L75)

The event component's ID.
