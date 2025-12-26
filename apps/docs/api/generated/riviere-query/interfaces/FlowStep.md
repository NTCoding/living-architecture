# Interface: FlowStep

Defined in: [domain-types.ts:176](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/domain-types.ts#L176)

A step in an execution flow.

## Properties

### component

> **component**: `Component`

Defined in: [domain-types.ts:178](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/domain-types.ts#L178)

The component at this step.

***

### depth

> **depth**: `number`

Defined in: [domain-types.ts:182](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/domain-types.ts#L182)

Depth from entry point (0 = entry point).

***

### externalLinks

> **externalLinks**: `ExternalLink`[]

Defined in: [domain-types.ts:184](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/domain-types.ts#L184)

External links from this component to external systems.

***

### linkType

> **linkType**: [`LinkType`](../type-aliases/LinkType.md) \| `undefined`

Defined in: [domain-types.ts:180](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/domain-types.ts#L180)

Type of link leading to this step (undefined for entry point).
