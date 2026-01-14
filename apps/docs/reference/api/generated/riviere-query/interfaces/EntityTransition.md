---
pageClass: reference
---

# Interface: EntityTransition

Defined in: [packages/riviere-query/src/event-types.ts:48](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L48)

A state transition in an entity's state machine.

## Properties

### from

> **from**: `string` & `$brand`\<`"State"`\>

Defined in: [packages/riviere-query/src/event-types.ts:50](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L50)

The state before the transition.

***

### to

> **to**: `string` & `$brand`\<`"State"`\>

Defined in: [packages/riviere-query/src/event-types.ts:52](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L52)

The state after the transition.

***

### triggeredBy

> **triggeredBy**: `string` & `$brand`\<`"OperationName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:54](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L54)

The operation that triggers this transition.
