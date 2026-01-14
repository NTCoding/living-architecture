---
pageClass: reference
---

# Interface: FlowStep

Defined in: [packages/riviere-query/src/domain-types.ts:178](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L178)

A step in an execution flow.

## Properties

### component

> **component**: `Component`

Defined in: [packages/riviere-query/src/domain-types.ts:180](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L180)

The component at this step.

***

### depth

> **depth**: `number`

Defined in: [packages/riviere-query/src/domain-types.ts:184](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L184)

Depth from entry point (0 = entry point).

***

### externalLinks

> **externalLinks**: `ExternalLink`[]

Defined in: [packages/riviere-query/src/domain-types.ts:186](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L186)

External links from this component to external systems.

***

### linkType

> **linkType**: [`LinkType`](../type-aliases/LinkType.md) \| `undefined`

Defined in: [packages/riviere-query/src/domain-types.ts:182](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L182)

Type of link leading to this step (undefined for entry point).
