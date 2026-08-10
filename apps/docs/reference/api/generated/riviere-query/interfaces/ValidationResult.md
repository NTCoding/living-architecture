---
pageClass: reference
---

# Interface: ValidationResult

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:116](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L116)

Result of graph validation.

## Riviere-role

query-model

## Properties

### errors

> **errors**: [`ValidationError`](ValidationError.md)[]

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:120](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L120)

List of validation errors (empty if valid).

***

### valid

> **valid**: `boolean`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:118](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L118)

Whether the graph passed validation.
