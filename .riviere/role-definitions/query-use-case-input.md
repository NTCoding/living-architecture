# query-use-case-input

## Purpose
A type that defines the single input contract for a query-use-case function.

## Behavioral Contract
This is a data structure, not behavior. It:
1. Defines all parameters a query-use-case needs to execute
2. Is the ONLY parameter type accepted by its corresponding query-use-case
3. Contains domain-relevant data, NOT raw external input

## Examples

### Canonical Example
```typescript
/** @riviere-role query-use-case-input */
export interface ListDomainsInput {
  graphPathOption?: string
}
```

### Edge Cases
- A type alias is valid: `export type FooInput = { ... }`
- Can contain optional fields for optional query variations
- Can reference value objects or other domain types as field types

## Anti-Patterns

### Common Misclassifications
- **Not a command-use-case-input**: command inputs feed write operations. If the corresponding use case is read-only, use query-use-case-input.
- **Not a value-object**: value objects are reusable domain concepts. Inputs are structural contracts for a specific query.

### Mixed Responsibility Signals
- If the input directly mirrors CLI flags with raw types — a factory should translate
- If the input contains fields only relevant to output formatting — those belong elsewhere

## Decision Guidance
- **vs command-use-case-input**: Is the corresponding function a query-use-case? → query-use-case-input. Is it a command-use-case? → command-use-case-input
