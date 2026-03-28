# cli-output-formatter

## Purpose
A function that transforms a command-use-case-result into user-facing CLI output (tables, JSON, markdown, colored text).

## Behavioral Contract
1. Accept a typed result (command-use-case-result or domain type)
2. Transform into a presentation format suitable for terminal output
3. Write to stdout/stderr or return formatted strings

## Examples

### Canonical Example
```typescript
/** @riviere-role cli-output-formatter */
export function presentExtractionResult(result: ExtractDraftComponentsResult): void {
  console.log(formatTable(result.components))
  console.log(`Extraction: ${result.extractionOutcome}`)
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a command-use-case**: formatters do not load state or invoke domain behavior
- **Not a domain-service**: formatters are infrastructure concerns, not domain logic

### Mixed Responsibility Signals
- If the formatter makes decisions about WHAT to show based on business rules — domain logic leaking in
- If the formatter loads additional data to enrich the output — command or repository responsibility leaking in
- If the formatter accepts raw CLI options to decide formatting — should accept a result type instead

## Decision Guidance
- **vs external-client-service**: Is it formatting output for the user? → cli-output-formatter. Is it wrapping an external library? → external-client-service
