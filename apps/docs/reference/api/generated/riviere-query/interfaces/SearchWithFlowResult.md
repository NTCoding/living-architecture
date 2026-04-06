---
pageClass: reference
---

# Interface: SearchWithFlowResult

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:248](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L248)

Result of searchWithFlow containing matches and their flow context.

## Riviere-role

query-model

## Properties

### matchingIds

> **matchingIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:250](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L250)

IDs of components that matched the search.

***

### visibleIds

> **visibleIds**: `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:252](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L252)

IDs of all components visible in the matching flows.
