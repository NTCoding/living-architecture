# Interface: DomainConnection

Defined in: [packages/riviere-query/src/domain-types.ts:220](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L220)

Summary of connections between domains.

## Properties

### apiCount

> **apiCount**: `number`

Defined in: [packages/riviere-query/src/domain-types.ts:226](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L226)

Number of API-based connections.

***

### direction

> **direction**: `"outgoing"` \| `"incoming"`

Defined in: [packages/riviere-query/src/domain-types.ts:224](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L224)

Direction relative to the queried domain.

***

### eventCount

> **eventCount**: `number`

Defined in: [packages/riviere-query/src/domain-types.ts:228](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L228)

Number of event-based connections.

***

### targetDomain

> **targetDomain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/domain-types.ts:222](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L222)

The connected domain name.
