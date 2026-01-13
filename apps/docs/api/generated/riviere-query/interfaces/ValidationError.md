# Interface: ValidationError

Defined in: [packages/riviere-query/src/domain-types.ts:63](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L63)

A validation error found in the graph.

## Properties

### code

> **code**: [`ValidationErrorCode`](../type-aliases/ValidationErrorCode.md)

Defined in: [packages/riviere-query/src/domain-types.ts:69](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L69)

Machine-readable error code.

***

### message

> **message**: `string`

Defined in: [packages/riviere-query/src/domain-types.ts:67](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L67)

Human-readable error description.

***

### path

> **path**: `string`

Defined in: [packages/riviere-query/src/domain-types.ts:65](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-query/src/domain-types.ts#L65)

JSON path to the error location.
