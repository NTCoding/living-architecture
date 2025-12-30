# Interface: ValidationResult

Defined in: [packages/riviere-query/src/domain-types.ts:73](https://github.com/NTCoding/living-architecture/blob/86a30c8aa4bee22db725a4e520eefb77d328660c/packages/riviere-query/src/domain-types.ts#L73)

Result of graph validation.

## Properties

### errors

> **errors**: [`ValidationError`](ValidationError.md)[]

Defined in: [packages/riviere-query/src/domain-types.ts:77](https://github.com/NTCoding/living-architecture/blob/86a30c8aa4bee22db725a4e520eefb77d328660c/packages/riviere-query/src/domain-types.ts#L77)

List of validation errors (empty if valid).

***

### valid

> **valid**: `boolean`

Defined in: [packages/riviere-query/src/domain-types.ts:75](https://github.com/NTCoding/living-architecture/blob/86a30c8aa4bee22db725a4e520eefb77d328660c/packages/riviere-query/src/domain-types.ts#L75)

Whether the graph passed validation.
