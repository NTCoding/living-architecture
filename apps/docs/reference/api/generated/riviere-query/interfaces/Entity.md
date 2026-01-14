# Interface: Entity

Defined in: [packages/riviere-query/src/event-types.ts:16](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L16)

A domain entity with its associated operations, states, and business rules.

## Properties

### businessRules

> `readonly` **businessRules**: `string`[]

Defined in: [packages/riviere-query/src/event-types.ts:29](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L29)

Deduplicated business rules from all operations.

***

### domain

> `readonly` **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:21](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L21)

The domain containing the entity.

***

### name

> `readonly` **name**: `string` & `$brand`\<`"EntityName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:19](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L19)

The entity name.

***

### operations

> `readonly` **operations**: `DomainOpComponent`[]

Defined in: [packages/riviere-query/src/event-types.ts:23](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L23)

All domain operations targeting this entity.

***

### states

> `readonly` **states**: `string` & `$brand`\<`"State"`\>[]

Defined in: [packages/riviere-query/src/event-types.ts:25](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L25)

Ordered states derived from state transitions (initial → terminal).

***

### transitions

> `readonly` **transitions**: [`EntityTransition`](EntityTransition.md)[]

Defined in: [packages/riviere-query/src/event-types.ts:27](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L27)

State transitions with triggering operations.

## Methods

### firstOperationId()

> **firstOperationId**(): `string` \| `undefined`

Defined in: [packages/riviere-query/src/event-types.ts:40](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L40)

#### Returns

`string` \| `undefined`

***

### hasBusinessRules()

> **hasBusinessRules**(): `boolean`

Defined in: [packages/riviere-query/src/event-types.ts:36](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L36)

#### Returns

`boolean`

***

### hasStates()

> **hasStates**(): `boolean`

Defined in: [packages/riviere-query/src/event-types.ts:32](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/event-types.ts#L32)

#### Returns

`boolean`
