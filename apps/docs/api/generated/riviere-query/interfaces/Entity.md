# Interface: Entity

Defined in: [event-types.ts:16](https://github.com/ntcoding/living-architecture/blob/33f79848ff5805eefab5e294fe621a7ebb3eb2cf/packages/riviere-query/src/event-types.ts#L16)

A domain entity with its associated operations.

## Properties

### domain

> **domain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [event-types.ts:20](https://github.com/ntcoding/living-architecture/blob/33f79848ff5805eefab5e294fe621a7ebb3eb2cf/packages/riviere-query/src/event-types.ts#L20)

The domain containing the entity.

***

### name

> **name**: `string` & `$brand`\<`"EntityName"`\>

Defined in: [event-types.ts:18](https://github.com/ntcoding/living-architecture/blob/33f79848ff5805eefab5e294fe621a7ebb3eb2cf/packages/riviere-query/src/event-types.ts#L18)

The entity name.

***

### operations

> **operations**: `DomainOpComponent`[]

Defined in: [event-types.ts:22](https://github.com/ntcoding/living-architecture/blob/33f79848ff5805eefab5e294fe621a7ebb3eb2cf/packages/riviere-query/src/event-types.ts#L22)

All domain operations targeting this entity.
