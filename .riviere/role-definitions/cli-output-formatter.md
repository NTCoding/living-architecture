# cli-output-formatter

## Purpose
A function that transforms an entrypoint-specific command/query result into user-facing CLI output or a presentation-specific CLI output shape.

## Behavioral Contract
1. Accept a typed command/query result or entrypoint-specific presentation options
2. Decide how that result is presented for the specific CLI entrypoint
3. Delegate generic response-envelope formatting to `cli-response-formatter`
4. Delegate writing stdout, stderr, file output, or process exit to `cli-response-writer`
5. Does NOT handle uncaught exceptions or regular domain/application control flow

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
- **Not a cli-response-formatter**: response formatters create generic success/error envelopes; output formatters decide entrypoint-specific presentation
- **Not a cli-response-writer**: response writers write already-created CLI responses to stdout/stderr/files or terminate the process
- **Not a cli-error-handler**: error handlers are only for uncaught CLI-boundary exceptions

### Mixed Responsibility Signals
- If the formatter makes decisions about WHAT to show based on business rules — domain logic leaking in
- If the formatter loads additional data to enrich the output — command or repository responsibility leaking in
- If the formatter accepts raw CLI options to decide formatting — should accept a result type instead
- If the formatter imports domain errors — use-case failure handling is leaking into the CLI boundary

## Decision Guidance
- **vs external-client-service**: Is it formatting output for the user? → cli-output-formatter. Is it wrapping an external library? → external-client-service
- **vs cli-response-formatter**: Is it creating the generic `success/error` CLI response envelope? → cli-response-formatter. Is it deciding how a specific entrypoint result should be presented? → cli-output-formatter
