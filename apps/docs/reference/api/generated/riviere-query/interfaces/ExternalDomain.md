---
pageClass: reference
---

# Interface: ExternalDomain

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:307](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L307)

An external domain that components connect to.

External domains are any systems not represented in the graph—third-party
services (Stripe, Twilio) or internal domains outside the current scope.

## Riviere-role

query-model

## Properties

### connectionCount

> **connectionCount**: `number`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:313](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L313)

Total number of connections to this external domain.

***

### name

> **name**: `string`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:309](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L309)

Name of the external domain (e.g., "Stripe", "Twilio").

***

### sourceDomains

> **sourceDomains**: `string` & `$brand`\<`"DomainName"`\>[]

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:311](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L311)

Domains that have connections to this external domain.
