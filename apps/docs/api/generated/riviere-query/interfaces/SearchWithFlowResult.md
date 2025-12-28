# Interface: SearchWithFlowResult

Defined in: [packages/riviere-query/src/domain-types.ts:200](https://github.com/ntcoding/living-architecture/blob/cbff252f4a73592ee31cdc39860927ac5c94b984/packages/riviere-query/src/domain-types.ts#L200)

Result of searchWithFlow containing matches and their flow context.

## Properties

### matchingIds

> **matchingIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [packages/riviere-query/src/domain-types.ts:202](https://github.com/ntcoding/living-architecture/blob/cbff252f4a73592ee31cdc39860927ac5c94b984/packages/riviere-query/src/domain-types.ts#L202)

IDs of components that matched the search.

***

### visibleIds

> **visibleIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [packages/riviere-query/src/domain-types.ts:204](https://github.com/ntcoding/living-architecture/blob/cbff252f4a73592ee31cdc39860927ac5c94b984/packages/riviere-query/src/domain-types.ts#L204)

IDs of all components visible in the matching flows.
