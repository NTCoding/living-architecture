# Interface: ComponentModification

Defined in: [domain-types.ts:119](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L119)

A component that was modified between graph versions.

## Properties

### after

> **after**: `Component`

Defined in: [domain-types.ts:125](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L125)

The component state after modification.

***

### before

> **before**: `Component`

Defined in: [domain-types.ts:123](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L123)

The component state before modification.

***

### changedFields

> **changedFields**: `string`[]

Defined in: [domain-types.ts:127](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L127)

List of field names that changed.

***

### id

> **id**: `string` & `$brand`\<`"ComponentId"`\>

Defined in: [domain-types.ts:121](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L121)

The component ID.
