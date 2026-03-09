---
pageClass: reference
---

# Interface: EntityTransition

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:49](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L49)

A state transition in an entity's state machine.

## Properties

### from

> **from**: `string` & `$brand`\<`"State"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:51](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L51)

The state before the transition.

***

### to

> **to**: `string` & `$brand`\<`"State"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:53](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L53)

The state after the transition.

***

### triggeredBy

> **triggeredBy**: `string` & `$brand`\<`"OperationName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:55](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L55)

The operation that triggers this transition.
