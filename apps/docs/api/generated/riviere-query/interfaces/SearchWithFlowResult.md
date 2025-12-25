# Interface: SearchWithFlowResult

Defined in: [domain-types.ts:198](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/domain-types.ts#L198)

Result of searchWithFlow containing matches and their flow context.

## Properties

### matchingIds

> **matchingIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [domain-types.ts:200](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/domain-types.ts#L200)

IDs of components that matched the search.

***

### visibleIds

> **visibleIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [domain-types.ts:202](https://github.com/ntcoding/living-architecture/blob/aced3ff111f4aa786ecadcb5e4f3eae782963f49/packages/riviere-query/src/domain-types.ts#L202)

IDs of all components visible in the matching flows.
