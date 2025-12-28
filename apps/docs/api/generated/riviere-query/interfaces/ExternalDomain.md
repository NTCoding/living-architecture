# Interface: ExternalDomain

Defined in: [packages/riviere-query/src/domain-types.ts:255](https://github.com/ntcoding/living-architecture/blob/cbff252f4a73592ee31cdc39860927ac5c94b984/packages/riviere-query/src/domain-types.ts#L255)

An external domain that components connect to.

External domains are any systems not represented in the graph—third-party
services (Stripe, Twilio) or internal domains outside the current scope.

## Properties

### connectionCount

> **connectionCount**: `number`

Defined in: [packages/riviere-query/src/domain-types.ts:261](https://github.com/ntcoding/living-architecture/blob/cbff252f4a73592ee31cdc39860927ac5c94b984/packages/riviere-query/src/domain-types.ts#L261)

Total number of connections to this external domain.

***

### name

> **name**: `string`

Defined in: [packages/riviere-query/src/domain-types.ts:257](https://github.com/ntcoding/living-architecture/blob/cbff252f4a73592ee31cdc39860927ac5c94b984/packages/riviere-query/src/domain-types.ts#L257)

Name of the external domain (e.g., "Stripe", "Twilio").

***

### sourceDomains

> **sourceDomains**: `string` & `$brand`\<`"DomainName"`\>[]

Defined in: [packages/riviere-query/src/domain-types.ts:259](https://github.com/ntcoding/living-architecture/blob/cbff252f4a73592ee31cdc39860927ac5c94b984/packages/riviere-query/src/domain-types.ts#L259)

Domains that have connections to this external domain.
