# Interface: GraphDiff

Defined in: [domain-types.ts:149](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/domain-types.ts#L149)

Complete diff between two graph versions.

## Properties

### components

> **components**: `object`

Defined in: [domain-types.ts:151](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/domain-types.ts#L151)

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

Defined in: [domain-types.ts:160](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/domain-types.ts#L160)

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

Defined in: [domain-types.ts:167](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/domain-types.ts#L167)

Summary statistics.
