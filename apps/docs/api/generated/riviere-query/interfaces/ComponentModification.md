# Interface: ComponentModification

Defined in: [packages/riviere-query/src/domain-types.ts:119](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L119)

A component that was modified between graph versions.

## Properties

### after

> **after**: `Component`

Defined in: [packages/riviere-query/src/domain-types.ts:125](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L125)

The component state after modification.

***

### before

> **before**: `Component`

Defined in: [packages/riviere-query/src/domain-types.ts:123](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L123)

The component state before modification.

***

### changedFields

> **changedFields**: `string`[]

Defined in: [packages/riviere-query/src/domain-types.ts:127](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L127)

List of field names that changed.

***

### id

> **id**: `string` & `$brand`\<`"ComponentId"`\>

Defined in: [packages/riviere-query/src/domain-types.ts:121](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L121)

The component ID.
