---
pageClass: reference
---

# Interface: EntityTransition

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:27](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L27)

A state transition in an entity's state machine.

## Riviere-role

value-object

## Properties

### from

> **from**: `string` & `$brand`\<`"State"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:29](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L29)

The state before the transition.

***

### to

> **to**: `string` & `$brand`\<`"State"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:31](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L31)

The state after the transition.

***

### triggeredBy

> **triggeredBy**: `string` & `$brand`\<`"OperationName"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:33](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L33)

The operation that triggers this transition.
