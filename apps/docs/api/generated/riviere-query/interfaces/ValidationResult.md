# Interface: ValidationResult

Defined in: [domain-types.ts:73](https://github.com/ntcoding/living-architecture/blob/ccfdb6e3781e7161105e665b956e24e9882c1760/packages/riviere-query/src/domain-types.ts#L73)

Result of graph validation.

## Properties

### errors

> **errors**: [`ValidationError`](ValidationError.md)[]

Defined in: [domain-types.ts:77](https://github.com/ntcoding/living-architecture/blob/ccfdb6e3781e7161105e665b956e24e9882c1760/packages/riviere-query/src/domain-types.ts#L77)

List of validation errors (empty if valid).

***

### valid

> **valid**: `boolean`

Defined in: [domain-types.ts:75](https://github.com/ntcoding/living-architecture/blob/ccfdb6e3781e7161105e665b956e24e9882c1760/packages/riviere-query/src/domain-types.ts#L75)

Whether the graph passed validation.
