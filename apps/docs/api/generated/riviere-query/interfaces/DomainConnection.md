# Interface: DomainConnection

Defined in: [domain-types.ts:218](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/domain-types.ts#L218)

Summary of connections between domains.

## Properties

### apiCount

> **apiCount**: `number`

Defined in: [domain-types.ts:224](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/domain-types.ts#L224)

Number of API-based connections.

***

### direction

> **direction**: `"outgoing"` \| `"incoming"`

Defined in: [domain-types.ts:222](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/domain-types.ts#L222)

Direction relative to the queried domain.

***

### eventCount

> **eventCount**: `number`

Defined in: [domain-types.ts:226](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/domain-types.ts#L226)

Number of event-based connections.

***

### targetDomain

> **targetDomain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [domain-types.ts:220](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/domain-types.ts#L220)

The connected domain name.
