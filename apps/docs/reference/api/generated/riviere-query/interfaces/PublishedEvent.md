---
pageClass: reference
---

# Interface: PublishedEvent

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:53](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L53)

A published event with its subscribers.

## Riviere-role

value-object

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:59](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L59)

The domain that publishes the event.

***

### eventName

> **eventName**: `string` & `$brand`\<`"EventName"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:57](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L57)

The event name.

***

### handlers

> **handlers**: [`EventSubscriber`](EventSubscriber.md)[]

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:61](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L61)

Event handlers subscribed to this event.

***

### id

> **id**: `string` & `$brand`\<`"EventId"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:55](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L55)

The event component's ID.
