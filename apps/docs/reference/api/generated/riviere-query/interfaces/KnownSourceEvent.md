# Interface: KnownSourceEvent

Defined in: [packages/riviere-query/src/event-types.ts:86](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L86)

A subscribed event where the source domain is known.

## Properties

### eventName

> **eventName**: `string` & `$brand`\<`"EventName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:88](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L88)

The event name.

***

### sourceDomain

> **sourceDomain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:90](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L90)

The domain that publishes this event.

***

### sourceKnown

> **sourceKnown**: `true`

Defined in: [packages/riviere-query/src/event-types.ts:92](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L92)

Indicates the source is known.
