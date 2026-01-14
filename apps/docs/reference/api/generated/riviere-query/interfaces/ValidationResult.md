---
pageClass: reference
---

# Interface: ValidationResult

Defined in: [packages/riviere-query/src/domain-types.ts:75](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L75)

Result of graph validation.

## Properties

### errors

> **errors**: [`ValidationError`](ValidationError.md)[]

Defined in: [packages/riviere-query/src/domain-types.ts:79](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L79)

List of validation errors (empty if valid).

***

### valid

> **valid**: `boolean`

Defined in: [packages/riviere-query/src/domain-types.ts:77](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L77)

Whether the graph passed validation.
