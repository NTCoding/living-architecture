# Interface: EntityTransition

Defined in: [packages/riviere-query/src/event-types.ts:28](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L28)

A state transition in an entity's state machine.

## Properties

### from

> **from**: `string` & `$brand`\<`"State"`\>

Defined in: [packages/riviere-query/src/event-types.ts:30](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L30)

The state before the transition.

***

### to

> **to**: `string` & `$brand`\<`"State"`\>

Defined in: [packages/riviere-query/src/event-types.ts:32](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L32)

The state after the transition.

***

### triggeredBy

> **triggeredBy**: `string` & `$brand`\<`"OperationName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:34](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L34)

The operation that triggers this transition.
