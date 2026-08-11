---
pageClass: reference
---

# Interface: Entity

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:14](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L14)

## Riviere-role

value-object

## Properties

### businessRules

> `readonly` **businessRules**: readonly `string`[]

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:20](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L20)

***

### domain

> `readonly` **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:16](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L16)

***

### name

> `readonly` **name**: `string` & `$brand`\<`"EntityName"`\>

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:15](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L15)

***

### operations

> `readonly` **operations**: readonly `DomainOpComponent`[]

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:17](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L17)

***

### states

> `readonly` **states**: readonly `string` & `$brand`\<`"State"`\>[]

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:18](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L18)

***

### transitions

> `readonly` **transitions**: readonly [`EntityTransition`](EntityTransition.md)[]

Defined in: [packages/riviere-query/src/features/querying/domain/event-types.ts:19](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/domain/event-types.ts#L19)
