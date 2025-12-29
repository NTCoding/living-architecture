# Interface: SearchWithFlowResult

Defined in: [packages/riviere-query/src/domain-types.ts:200](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L200)

Result of searchWithFlow containing matches and their flow context.

## Properties

### matchingIds

> **matchingIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [packages/riviere-query/src/domain-types.ts:202](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L202)

IDs of components that matched the search.

***

### visibleIds

> **visibleIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [packages/riviere-query/src/domain-types.ts:204](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L204)

IDs of all components visible in the matching flows.
