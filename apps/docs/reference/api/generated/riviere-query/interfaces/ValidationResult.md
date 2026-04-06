---
pageClass: reference
---

# Interface: ValidationResult

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:110](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L110)

Result of graph validation.

## Riviere-role

query-model

## Properties

### errors

> **errors**: [`ValidationError`](ValidationError.md)[]

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:114](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L114)

List of validation errors (empty if valid).

***

### valid

> **valid**: `boolean`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:112](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L112)

Whether the graph passed validation.
