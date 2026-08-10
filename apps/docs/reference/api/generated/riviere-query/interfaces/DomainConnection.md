---
pageClass: reference
---

# Interface: DomainConnection

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:276](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L276)

Summary of connections between domains.

## Riviere-role

query-model

## Properties

### apiCount

> **apiCount**: `number`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:282](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L282)

Number of API-based connections.

***

### direction

> **direction**: `"outgoing"` \| `"incoming"`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:280](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L280)

Direction relative to the queried domain.

***

### eventCount

> **eventCount**: `number`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:284](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L284)

Number of event-based connections.

***

### targetDomain

> **targetDomain**: `string` & `$brand`\<`"DomainName"`\>

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:278](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L278)

The connected domain name.
