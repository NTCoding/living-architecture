# Interface: ExternalDomain

Defined in: [domain-types.ts:255](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/domain-types.ts#L255)

An external domain that components connect to.

External domains are any systems not represented in the graph—third-party
services (Stripe, Twilio) or internal domains outside the current scope.

## Properties

### connectionCount

> **connectionCount**: `number`

Defined in: [domain-types.ts:261](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/domain-types.ts#L261)

Total number of connections to this external domain.

***

### name

> **name**: `string`

Defined in: [domain-types.ts:257](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/domain-types.ts#L257)

Name of the external domain (e.g., "Stripe", "Twilio").

***

### sourceDomains

> **sourceDomains**: `string` & `$brand`\<`"DomainName"`\>[]

Defined in: [domain-types.ts:259](https://github.com/ntcoding/living-architecture/blob/c0b5781cd918770d734edbb65e0f96b76d45cc15/packages/riviere-query/src/domain-types.ts#L259)

Domains that have connections to this external domain.
