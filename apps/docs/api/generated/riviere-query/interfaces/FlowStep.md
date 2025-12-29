# Interface: FlowStep

Defined in: [packages/riviere-query/src/domain-types.ts:176](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/domain-types.ts#L176)

A step in an execution flow.

## Properties

### component

> **component**: `Component`

Defined in: [packages/riviere-query/src/domain-types.ts:178](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/domain-types.ts#L178)

The component at this step.

***

### depth

> **depth**: `number`

Defined in: [packages/riviere-query/src/domain-types.ts:182](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/domain-types.ts#L182)

Depth from entry point (0 = entry point).

***

### externalLinks

> **externalLinks**: `ExternalLink`[]

Defined in: [packages/riviere-query/src/domain-types.ts:184](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/domain-types.ts#L184)

External links from this component to external systems.

***

### linkType

> **linkType**: [`LinkType`](../type-aliases/LinkType.md) \| `undefined`

Defined in: [packages/riviere-query/src/domain-types.ts:180](https://github.com/ntcoding/living-architecture/blob/71e2269f663811c97e1a1873a1384dd999dc80c7/packages/riviere-query/src/domain-types.ts#L180)

Type of link leading to this step (undefined for entry point).
