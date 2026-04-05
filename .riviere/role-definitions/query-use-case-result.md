# query-use-case-result

## Purpose
A type that defines the single return contract for a query-use-case function.

## Behavioral Contract
This is a data structure. It:
1. Defines what a query-use-case returns after execution
2. Contains domain-meaningful results, not raw infrastructure output
3. Is consumed by cli-output-formatters or other downstream code

## Examples

### Canonical Example
```typescript
/** @riviere-role query-use-case-result */
export interface ListDomainsResult {
  domains: DomainSummary[]
}
```

### Edge Cases
- Can be a discriminated union for different result shapes
- Can reference domain types (value objects, query-use-case-result-values) in its fields

## Anti-Patterns

### Common Misclassifications
- **Not a command-use-case-result**: command results come from write operations. If the corresponding use case is read-only, use query-use-case-result.
- **Not a value-object**: value objects are reusable domain concepts; results are specific to one query.

### Mixed Responsibility Signals
- If the result contains presentation-specific fields (formatted strings, colors, table layouts) — that's cli-output-formatter responsibility
- If the result directly mirrors raw query model output without any shaping — the query-use-case may not be adding value

## Decision Guidance
- **vs command-use-case-result**: Is the corresponding function a query-use-case? → query-use-case-result. Is it a command-use-case? → command-use-case-result
