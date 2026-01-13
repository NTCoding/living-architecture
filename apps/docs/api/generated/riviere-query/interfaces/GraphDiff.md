# Interface: GraphDiff

Defined in: [packages/riviere-query/src/domain-types.ts:151](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L151)

Complete diff between two graph versions.

## Properties

### components

> **components**: `object`

Defined in: [packages/riviere-query/src/domain-types.ts:153](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L153)

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

Defined in: [packages/riviere-query/src/domain-types.ts:162](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L162)

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

Defined in: [packages/riviere-query/src/domain-types.ts:169](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L169)

Summary statistics.
