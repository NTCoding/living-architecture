# Interface: ValidationResult

Defined in: [domain-types.ts:73](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/domain-types.ts#L73)

Result of graph validation.

## Properties

### errors

> **errors**: [`ValidationError`](ValidationError.md)[]

Defined in: [domain-types.ts:77](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/domain-types.ts#L77)

List of validation errors (empty if valid).

***

### valid

> **valid**: `boolean`

Defined in: [domain-types.ts:75](https://github.com/ntcoding/living-architecture/blob/b60ad4799408c0a38070973ef0e218212bccdf18/packages/riviere-query/src/domain-types.ts#L75)

Whether the graph passed validation.
