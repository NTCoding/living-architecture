# Interface: EntityTransition

Defined in: [event-types.ts:28](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/event-types.ts#L28)

A state transition in an entity's state machine.

## Properties

### from

> **from**: `string` & `$brand`\<`"State"`\>

Defined in: [event-types.ts:30](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/event-types.ts#L30)

The state before the transition.

***

### to

> **to**: `string` & `$brand`\<`"State"`\>

Defined in: [event-types.ts:32](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/event-types.ts#L32)

The state after the transition.

***

### triggeredBy

> **triggeredBy**: `string` & `$brand`\<`"OperationName"`\>

Defined in: [event-types.ts:34](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/event-types.ts#L34)

The operation that triggers this transition.
