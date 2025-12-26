# Interface: KnownSourceEvent

Defined in: [event-types.ts:66](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/event-types.ts#L66)

A subscribed event where the source domain is known.

## Properties

### eventName

> **eventName**: `string` & `$brand`\<`"EventName"`\>

Defined in: [event-types.ts:68](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/event-types.ts#L68)

The event name.

***

### sourceDomain

> **sourceDomain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [event-types.ts:70](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/event-types.ts#L70)

The domain that publishes this event.

***

### sourceKnown

> **sourceKnown**: `true`

Defined in: [event-types.ts:72](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/event-types.ts#L72)

Indicates the source is known.
