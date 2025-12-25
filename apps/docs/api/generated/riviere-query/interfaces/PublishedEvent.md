# Interface: PublishedEvent

Defined in: [event-types.ts:52](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/event-types.ts#L52)

A published event with its subscribers.

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [event-types.ts:58](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/event-types.ts#L58)

The domain that publishes the event.

***

### eventName

> **eventName**: `string` & `$brand`\<`"EventName"`\>

Defined in: [event-types.ts:56](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/event-types.ts#L56)

The event name.

***

### handlers

> **handlers**: [`EventSubscriber`](EventSubscriber.md)[]

Defined in: [event-types.ts:60](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/event-types.ts#L60)

Event handlers subscribed to this event.

***

### id

> **id**: `string` & `$brand`\<`"EventId"`\>

Defined in: [event-types.ts:54](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/event-types.ts#L54)

The event component's ID.
