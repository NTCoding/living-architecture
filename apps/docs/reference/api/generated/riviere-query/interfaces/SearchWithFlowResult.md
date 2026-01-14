---
pageClass: reference
---

# Interface: SearchWithFlowResult

Defined in: [packages/riviere-query/src/domain-types.ts:202](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L202)

Result of searchWithFlow containing matches and their flow context.

## Properties

### matchingIds

> **matchingIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [packages/riviere-query/src/domain-types.ts:204](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L204)

IDs of components that matched the search.

***

### visibleIds

> **visibleIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [packages/riviere-query/src/domain-types.ts:206](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L206)

IDs of all components visible in the matching flows.
