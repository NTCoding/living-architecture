# Interface: KnownSourceEvent

Defined in: [packages/riviere-query/src/event-types.ts:66](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/event-types.ts#L66)

A subscribed event where the source domain is known.

## Properties

### eventName

> **eventName**: `string` & `$brand`\<`"EventName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:68](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/event-types.ts#L68)

The event name.

***

### sourceDomain

> **sourceDomain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:70](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/event-types.ts#L70)

The domain that publishes this event.

***

### sourceKnown

> **sourceKnown**: `true`

Defined in: [packages/riviere-query/src/event-types.ts:72](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/event-types.ts#L72)

Indicates the source is known.
