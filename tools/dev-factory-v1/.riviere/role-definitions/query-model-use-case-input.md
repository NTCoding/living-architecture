# query-model-use-case-input

## Purpose
A type that defines the single input contract for a query-model-use-case. The entrypoint constructs this type and passes it to the use case.

## Behavioral Contract
This is a data structure, not behavior. It:
1. Defines all parameters a query-model-use-case needs to execute
2. Is the ONLY parameter type accepted by its corresponding query-model-use-case
3. Contains domain-relevant data, NOT raw external input

## Examples

### Canonical Example
```typescript
/** @riviere-role query-model-use-case-input */
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
- **Not a command-use-case-input**: command inputs feed write operations. If the corresponding use case is read-only, use query-model-use-case-input.
- **Not a value-object**: value objects are reusable domain concepts. Inputs are structural contracts for a specific use case.

### Mixed Responsibility Signals
- If the input directly mirrors CLI flags with raw types — a factory should translate
- If the input contains fields only relevant to output formatting — those belong elsewhere

## Decision Guidance
- **vs command-use-case-input**: Is the corresponding use case a query-model-use-case? → query-model-use-case-input. Is it a command-use-case? → command-use-case-input
