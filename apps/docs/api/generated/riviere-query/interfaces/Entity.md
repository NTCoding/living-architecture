# Interface: Entity

Defined in: [packages/riviere-query/src/event-types.ts:16](https://github.com/NTCoding/living-architecture/blob/86a30c8aa4bee22db725a4e520eefb77d328660c/packages/riviere-query/src/event-types.ts#L16)

A domain entity with its associated operations.

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:20](https://github.com/NTCoding/living-architecture/blob/86a30c8aa4bee22db725a4e520eefb77d328660c/packages/riviere-query/src/event-types.ts#L20)

The domain containing the entity.

***

### name

> **name**: `string` & `$brand`\<`"EntityName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:18](https://github.com/NTCoding/living-architecture/blob/86a30c8aa4bee22db725a4e520eefb77d328660c/packages/riviere-query/src/event-types.ts#L18)

The entity name.

***

### operations

> **operations**: `DomainOpComponent`[]

Defined in: [packages/riviere-query/src/event-types.ts:22](https://github.com/NTCoding/living-architecture/blob/86a30c8aa4bee22db725a4e520eefb77d328660c/packages/riviere-query/src/event-types.ts#L22)

All domain operations targeting this entity.
