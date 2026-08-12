---
pageClass: reference
---

# Class: Entity

Defined in: packages/riviere-query/src/features/querying/domain/entity.ts:8

## Riviere-role

value-object

## Properties

### businessRules

> `readonly` **businessRules**: readonly `string`[]

Defined in: packages/riviere-query/src/features/querying/domain/entity.ts:28

***

### domain

> `readonly` **domain**: `DomainName`

Defined in: packages/riviere-query/src/features/querying/domain/entity.ts:24

***

### name

> `readonly` **name**: `EntityName`

Defined in: packages/riviere-query/src/features/querying/domain/entity.ts:23

***

### operations

> `readonly` **operations**: readonly `DomainOpComponent`[]

Defined in: packages/riviere-query/src/features/querying/domain/entity.ts:25

***

### states

> `readonly` **states**: readonly [`State`](State.md)[]

Defined in: packages/riviere-query/src/features/querying/domain/entity.ts:26

***

### transitions

> `readonly` **transitions**: readonly [`EntityTransition`](EntityTransition.md)[]

Defined in: packages/riviere-query/src/features/querying/domain/entity.ts:27

## Methods

### firstOperationId()

> **firstOperationId**(): `string` \| `undefined`

Defined in: packages/riviere-query/src/features/querying/domain/entity.ts:39

#### Returns

`string` \| `undefined`

***

### hasBusinessRules()

> **hasBusinessRules**(): `boolean`

Defined in: packages/riviere-query/src/features/querying/domain/entity.ts:35

#### Returns

`boolean`

***

### hasStates()

> **hasStates**(): `boolean`

Defined in: packages/riviere-query/src/features/querying/domain/entity.ts:31

#### Returns

`boolean`

***

### parse()

> `static` **parse**(`name`, `domain`, `operations`, `states`, `transitions`, `businessRules`): `Entity`

Defined in: packages/riviere-query/src/features/querying/domain/entity.ts:11

#### Parameters

##### name

`EntityName`

##### domain

`DomainName`

##### operations

readonly `DomainOpComponent`[]

##### states

readonly [`State`](State.md)[]

##### transitions

readonly [`EntityTransition`](EntityTransition.md)[]

##### businessRules

readonly `string`[]

#### Returns

`Entity`
