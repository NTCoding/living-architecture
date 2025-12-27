# Interface: SearchWithFlowResult

Defined in: [domain-types.ts:200](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L200)

Result of searchWithFlow containing matches and their flow context.

## Properties

### matchingIds

> **matchingIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [domain-types.ts:202](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L202)

IDs of components that matched the search.

***

### visibleIds

> **visibleIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [domain-types.ts:204](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L204)

IDs of all components visible in the matching flows.
