# cli-input-validator

## Purpose
A function that validates a single CLI input value (type string, enum, flag) and returns a structured result indicating validity.

## Behavioral Contract
1. Accept one or more raw CLI values (strings, possibly undefined)
2. Check the value against allowed values or format rules
3. Return a structured validation result — either `{ valid: true }` or `{ valid: false, errorJson: string }`
4. Does NOT throw; communicates failure through the return type
5. Does NOT perform domain logic — only checks if the raw input is acceptable for the CLI layer

## Examples

### Canonical Example
```typescript
/** @riviere-role cli-input-validator */
export function validateComponentType(componentType: string): ValidationResult {
  if (isValidComponentType(componentType)) {
    return { valid: true }
  }
  return {
    valid: false,
    errorJson: JSON.stringify(formatError(CliErrorCode.ValidationError, `Invalid component type: ${componentType}`)),
  }
}
```

### Edge Cases
- A predicate function (`isValidHttpMethod`) that returns a boolean type guard is a helper; if exported, classify as `cli-input-validator` when used as a validation boundary
- A function that aggregates multiple sub-validations (validateOptions) is still `cli-input-validator` — it validates a set of related CLI options as a unit

## Anti-Patterns

### Common Misclassifications
- **Not a domain-service**: domain services perform business logic on domain entities; validators only check CLI input acceptability
- **Not a command-input-factory**: factories *construct* domain inputs from raw data; validators only *check* raw data is acceptable
- **Not a cli-output-formatter**: validators return structured results, they do not write to stdout/stderr

### Mixed Responsibility Signals
- If the function both validates AND constructs a domain object — split into validator + factory
- If the function throws instead of returning a ValidationResult — this is a design smell; consider returning a result type

## Decision Guidance
- **vs command-input-factory**: Does it validate a value (true/false + error)? → cli-input-validator. Does it construct a domain object from raw input? → command-input-factory
- **vs domain-service**: Is it enforcing a CLI-layer rule (valid flag value, allowed option set)? → cli-input-validator. Is it a business rule? → domain-service
