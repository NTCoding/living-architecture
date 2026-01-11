# Interface: ComponentModification

Defined in: [packages/riviere-query/src/domain-types.ts:121](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L121)

A component that was modified between graph versions.

## Properties

### after

> **after**: `Component`

Defined in: [packages/riviere-query/src/domain-types.ts:127](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L127)

The component state after modification.

***

### before

> **before**: `Component`

Defined in: [packages/riviere-query/src/domain-types.ts:125](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L125)

The component state before modification.

***

### changedFields

> **changedFields**: `string`[]

Defined in: [packages/riviere-query/src/domain-types.ts:129](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L129)

List of field names that changed.

***

### id

> **id**: `string` & `$brand`\<`"ComponentId"`\>

Defined in: [packages/riviere-query/src/domain-types.ts:123](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L123)

The component ID.
