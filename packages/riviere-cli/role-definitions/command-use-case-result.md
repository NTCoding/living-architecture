# command-use-case-result

## Purpose
A type that defines the single return contract for a command-use-case function.

## Behavioral Contract
This is a data structure. It:
1. Defines what a command-use-case returns after execution
2. Contains domain-meaningful results, not raw infrastructure output
3. Is consumed by cli-output-formatters or other downstream code

## Examples

### Canonical Example
```typescript
/** @riviere-role command-use-case-result */
export interface ExtractDraftComponentsResult {
  components: DraftComponent[]
  extractionOutcome: ExtractionOutcome
}
```

### Edge Cases
- Can be a discriminated union for success/failure: `type Result = SuccessResult | FailureResult`
- Can reference domain types (aggregates, value objects) in its fields

## Anti-Patterns

### Common Misclassifications
- **Not an external-client-model**: client models represent external data shapes, not command outcomes
- **Not a value-object**: value objects are reusable domain concepts; results are specific to one command

### Mixed Responsibility Signals
- If the result contains presentation-specific fields (formatted strings, colors, table layouts) — that's cli-output-formatter responsibility
- If the result directly mirrors what an external API returns — the command may not be adding domain value

## Decision Guidance
- **vs value-object**: Is it the specific return type of a command-use-case? → command-use-case-result. Is it a reusable concept used across multiple contexts? → value-object
