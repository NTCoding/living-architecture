# Interface: ValidationResult

Defined in: [packages/riviere-query/src/domain-types.ts:73](https://github.com/ntcoding/living-architecture/blob/cbff252f4a73592ee31cdc39860927ac5c94b984/packages/riviere-query/src/domain-types.ts#L73)

Result of graph validation.

## Properties

### errors

> **errors**: [`ValidationError`](ValidationError.md)[]

Defined in: [packages/riviere-query/src/domain-types.ts:77](https://github.com/ntcoding/living-architecture/blob/cbff252f4a73592ee31cdc39860927ac5c94b984/packages/riviere-query/src/domain-types.ts#L77)

List of validation errors (empty if valid).

***

### valid

> **valid**: `boolean`

Defined in: [packages/riviere-query/src/domain-types.ts:75](https://github.com/ntcoding/living-architecture/blob/cbff252f4a73592ee31cdc39860927ac5c94b984/packages/riviere-query/src/domain-types.ts#L75)

Whether the graph passed validation.
