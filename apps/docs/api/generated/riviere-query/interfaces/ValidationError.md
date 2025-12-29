# Interface: ValidationError

Defined in: [packages/riviere-query/src/domain-types.ts:61](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L61)

A validation error found in the graph.

## Properties

### code

> **code**: [`ValidationErrorCode`](../type-aliases/ValidationErrorCode.md)

Defined in: [packages/riviere-query/src/domain-types.ts:67](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L67)

Machine-readable error code.

***

### message

> **message**: `string`

Defined in: [packages/riviere-query/src/domain-types.ts:65](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L65)

Human-readable error description.

***

### path

> **path**: `string`

Defined in: [packages/riviere-query/src/domain-types.ts:63](https://github.com/ntcoding/living-architecture/blob/f8344d72e1c34413c214bfbca6e072f88255c627/packages/riviere-query/src/domain-types.ts#L63)

JSON path to the error location.
