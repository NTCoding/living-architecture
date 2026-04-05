# query-use-case-result-value

## Purpose
A type that represents a domain concept returned as part of a query-use-case-result.

## Behavioral Contract
This is a data structure. It:
1. Represents a meaningful domain concept within a query result
2. Is referenced by a query-use-case-result type
3. May be derived from query model types (e.g., via ReturnType)

## Examples

### Canonical Example
```typescript
/** @riviere-role query-use-case-result-value */
export type DomainSummary = ReturnType<RiviereQuery['domains']>[number]
```

### Edge Cases
- Can be a type alias derived from query model return types
- Can be a standalone interface defining a result shape
- Multiple result-value types per result file are valid

## Anti-Patterns

### Common Misclassifications
- **Not a value-object**: value objects are reusable domain concepts. Result values are specific to query results.
- **Not a query-use-case-result**: results are the top-level return type of the query. Result values are the domain types inside them.

## Decision Guidance
- **vs value-object**: Is it specifically used inside a query-use-case-result? → query-use-case-result-value. Is it a reusable concept across multiple contexts? → value-object
- **vs query-use-case-result**: Is it the top-level return type of the query function? → query-use-case-result. Is it a type referenced within the result? → query-use-case-result-value
