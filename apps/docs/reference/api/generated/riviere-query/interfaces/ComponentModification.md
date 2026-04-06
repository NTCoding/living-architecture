---
pageClass: reference
---

# Interface: ComponentModification

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:159](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L159)

A component that was modified between graph versions.

## Riviere-role

query-model

## Properties

### after

> **after**: `Component`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:165](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L165)

The component state after modification.

***

### before

> **before**: `Component`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:163](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L163)

The component state before modification.

***

### changedFields

> **changedFields**: `string`[]

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:167](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L167)

List of field names that changed.

***

### id

> **id**: `string` & `$brand`\<`"ComponentId"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:161](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L161)

The component ID.
