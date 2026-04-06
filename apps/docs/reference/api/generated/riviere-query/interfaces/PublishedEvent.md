---
pageClass: reference
---

# Interface: PublishedEvent

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:76](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L76)

A published event with its subscribers.

## Riviere-role

query-model

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:82](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L82)

The domain that publishes the event.

***

### eventName

> **eventName**: `string` & `$brand`\<`"EventName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:80](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L80)

The event name.

***

### handlers

> **handlers**: [`EventSubscriber`](EventSubscriber.md)[]

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:84](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L84)

Event handlers subscribed to this event.

***

### id

> **id**: `string` & `$brand`\<`"EventId"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:78](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L78)

The event component's ID.
