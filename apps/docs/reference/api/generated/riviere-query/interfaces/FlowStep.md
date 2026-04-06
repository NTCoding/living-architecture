---
pageClass: reference
---

# Interface: FlowStep

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:222](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L222)

A step in an execution flow.

## Riviere-role

query-model

## Properties

### component

> **component**: `Component`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:224](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L224)

The component at this step.

***

### depth

> **depth**: `number`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:228](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L228)

Depth from entry point (0 = entry point).

***

### externalLinks

> **externalLinks**: `ExternalLink`[]

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:230](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L230)

External links from this component to external systems.

***

### linkType

> **linkType**: [`LinkType`](../type-aliases/LinkType.md) \| `undefined`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:226](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L226)

Type of link leading to this step (undefined for entry point).
