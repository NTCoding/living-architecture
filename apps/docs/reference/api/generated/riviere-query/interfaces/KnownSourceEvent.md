---
pageClass: reference
---

# Interface: KnownSourceEvent

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:87](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L87)

A subscribed event where the source domain is known.

## Properties

### eventName

> **eventName**: `string` & `$brand`\<`"EventName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:89](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L89)

The event name.

***

### sourceDomain

> **sourceDomain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:91](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L91)

The domain that publishes this event.

***

### sourceKnown

> **sourceKnown**: `true`

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:93](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L93)

Indicates the source is known.
