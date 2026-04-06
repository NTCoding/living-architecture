---
pageClass: reference
---

# Interface: ValidationError

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:97](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L97)

A validation error found in the graph.

## Riviere-role

query-model

## Properties

### code

> **code**: [`ValidationErrorCode`](../type-aliases/ValidationErrorCode.md)

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:103](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L103)

Machine-readable error code.

***

### message

> **message**: `string`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:101](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L101)

Human-readable error description.

***

### path

> **path**: `string`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:99](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L99)

JSON path to the error location.
