---
pageClass: reference
---

# Interface: KnownSourceEvent

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:91](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L91)

A subscribed event where the source domain is known.

## Riviere-role

query-model

## Properties

### eventName

> **eventName**: `string` & `$brand`\<`"EventName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:93](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L93)

The event name.

***

### sourceDomain

> **sourceDomain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:95](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L95)

The domain that publishes this event.

***

### sourceKnown

> **sourceKnown**: `true`

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:97](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L97)

Indicates the source is known.
