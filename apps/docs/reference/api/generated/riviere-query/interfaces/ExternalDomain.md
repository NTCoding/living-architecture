---
pageClass: reference
---

# Interface: ExternalDomain

Defined in: [packages/riviere-query/src/domain-types.ts:257](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L257)

An external domain that components connect to.

External domains are any systems not represented in the graph—third-party
services (Stripe, Twilio) or internal domains outside the current scope.

## Properties

### connectionCount

> **connectionCount**: `number`

Defined in: [packages/riviere-query/src/domain-types.ts:263](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L263)

Total number of connections to this external domain.

***

### name

> **name**: `string`

Defined in: [packages/riviere-query/src/domain-types.ts:259](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L259)

Name of the external domain (e.g., "Stripe", "Twilio").

***

### sourceDomains

> **sourceDomains**: `string` & `$brand`\<`"DomainName"`\>[]

Defined in: [packages/riviere-query/src/domain-types.ts:261](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L261)

Domains that have connections to this external domain.
