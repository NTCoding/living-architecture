# Interface: Entity

Defined in: [event-types.ts:16](https://github.com/ntcoding/living-architecture/blob/ccfdb6e3781e7161105e665b956e24e9882c1760/packages/riviere-query/src/event-types.ts#L16)

A domain entity with its associated operations.

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [event-types.ts:20](https://github.com/ntcoding/living-architecture/blob/ccfdb6e3781e7161105e665b956e24e9882c1760/packages/riviere-query/src/event-types.ts#L20)

The domain containing the entity.

***

### name

> **name**: `string` & `$brand`\<`"EntityName"`\>

Defined in: [event-types.ts:18](https://github.com/ntcoding/living-architecture/blob/ccfdb6e3781e7161105e665b956e24e9882c1760/packages/riviere-query/src/event-types.ts#L18)

The entity name.

***

### operations

> **operations**: `DomainOpComponent`[]

Defined in: [event-types.ts:22](https://github.com/ntcoding/living-architecture/blob/ccfdb6e3781e7161105e665b956e24e9882c1760/packages/riviere-query/src/event-types.ts#L22)

All domain operations targeting this entity.
