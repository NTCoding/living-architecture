---
pageClass: reference
---

# Interface: Entity

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:17](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L17)

A domain entity with its associated operations, states, and business rules.

## Riviere-role

query-model

## Properties

### businessRules

> `readonly` **businessRules**: `string`[]

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:30](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L30)

Deduplicated business rules from all operations.

***

### domain

> `readonly` **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:22](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L22)

The domain containing the entity.

***

### name

> `readonly` **name**: `string` & `$brand`\<`"EntityName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:20](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L20)

The entity name.

***

### operations

> `readonly` **operations**: `DomainOpComponent`[]

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:24](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L24)

All domain operations targeting this entity.

***

### states

> `readonly` **states**: `string` & `$brand`\<`"State"`\>[]

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:26](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L26)

Ordered states derived from state transitions (initial → terminal).

***

### transitions

> `readonly` **transitions**: [`EntityTransition`](EntityTransition.md)[]

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:28](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L28)

State transitions with triggering operations.

## Methods

### firstOperationId()

> **firstOperationId**(): `string` \| `undefined`

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:41](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L41)

#### Returns

`string` \| `undefined`

***

### hasBusinessRules()

> **hasBusinessRules**(): `boolean`

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:37](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L37)

#### Returns

`boolean`

***

### hasStates()

> **hasStates**(): `boolean`

Defined in: [packages/riviere-query/src/features/querying/queries/event-types.ts:33](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/event-types.ts#L33)

#### Returns

`boolean`
