---
pageClass: reference
---

# Interface: KnownSourceEvent

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:68](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L68)

A subscribed event where the source domain is known.

## Riviere-role

value-object

## Properties

### eventName

> **eventName**: `string` & `$brand`\<`"EventName"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:70](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L70)

The event name.

***

### sourceDomain

> **sourceDomain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:72](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L72)

The domain that publishes this event.

***

### sourceKnown

> **sourceKnown**: `true`

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:74](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L74)

Indicates the source is known.
