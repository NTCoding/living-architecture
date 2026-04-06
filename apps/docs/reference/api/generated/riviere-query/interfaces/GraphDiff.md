---
pageClass: reference
---

# Interface: GraphDiff

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:191](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L191)

Complete diff between two graph versions.

## Riviere-role

query-model

## Properties

### components

> **components**: `object`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:193](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L193)

Component changes.

#### added

> **added**: `Component`[]

Components present in new graph but not old.

#### modified

> **modified**: [`ComponentModification`](ComponentModification.md)[]

Components present in both with different values.

#### removed

> **removed**: `Component`[]

Components present in old graph but not new.

***

### links

> **links**: `object`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:202](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L202)

Link changes.

#### added

> **added**: `Link`[]

Links present in new graph but not old.

#### removed

> **removed**: `Link`[]

Links present in old graph but not new.

***

### stats

> **stats**: [`DiffStats`](DiffStats.md)

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:209](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L209)

Summary statistics.
