---
pageClass: reference
---

# Interface: ValidationError

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:103](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L103)

A validation error found in the graph.

## Riviere-role

query-model

## Properties

### code

> **code**: [`ValidationErrorCode`](../type-aliases/ValidationErrorCode.md)

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:109](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L109)

Machine-readable error code.

***

### message

> **message**: `string`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:107](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L107)

Human-readable error description.

***

### path

> **path**: `string`

Defined in: [packages/riviere-query/src/features/querying/queries/domain-types.ts:105](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/features/querying/queries/domain-types.ts#L105)

JSON path to the error location.
