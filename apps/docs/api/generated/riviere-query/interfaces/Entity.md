# Interface: Entity

Defined in: [packages/riviere-query/src/event-types.ts:16](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/event-types.ts#L16)

A domain entity with its associated operations.

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:20](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/event-types.ts#L20)

The domain containing the entity.

***

### name

> **name**: `string` & `$brand`\<`"EntityName"`\>

Defined in: [packages/riviere-query/src/event-types.ts:18](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/event-types.ts#L18)

The entity name.

***

### operations

> **operations**: `DomainOpComponent`[]

Defined in: [packages/riviere-query/src/event-types.ts:22](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/event-types.ts#L22)

All domain operations targeting this entity.
