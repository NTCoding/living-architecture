# Interface: ValidationError

Defined in: [domain-types.ts:61](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L61)

A validation error found in the graph.

## Properties

### code

> **code**: [`ValidationErrorCode`](../type-aliases/ValidationErrorCode.md)

Defined in: [domain-types.ts:67](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L67)

Machine-readable error code.

***

### message

> **message**: `string`

Defined in: [domain-types.ts:65](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L65)

Human-readable error description.

***

### path

> **path**: `string`

Defined in: [domain-types.ts:63](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-query/src/domain-types.ts#L63)

JSON path to the error location.
