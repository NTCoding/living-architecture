---
pageClass: reference
---

# Interface: SearchWithFlowResult

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:254](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L254)

Result of searchWithFlow containing matches and their flow context.

## Riviere-role

query-model

## Properties

### matchingIds

> **matchingIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:256](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L256)

IDs of components that matched the search.

***

### visibleIds

> **visibleIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:258](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L258)

IDs of all components visible in the matching flows.
