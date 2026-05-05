# cli-response-writer

## Purpose
A function that writes an already-created CLI response to the CLI output boundary.

## Behavioral Contract
1. Accept an already-formatted CLI response or enough information to create one directly
2. Write the response to stdout, stderr, or a configured output file
3. May terminate the process when the response represents a terminal CLI failure
4. Does NOT decide entrypoint-specific presentation
5. Does NOT handle regular domain/application control flow

## Examples

### Canonical Example
```typescript
/** @riviere-role cli-response-writer */
export function outputResult<T>(data: SuccessOutput<T>, options: OutputOptions): void {
  console.log(JSON.stringify(data))
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a cli-output-formatter**: output formatters decide what to present; response writers perform the output side effect
- **Not a cli-error-handler**: error handlers classify uncaught exceptions; response writers write responses

### Mixed Responsibility Signals
- If the function switches on a command result shape — entrypoint output formatting is leaking in
- If the function imports domain errors — use-case failure handling is leaking into CLI response writing

## Decision Guidance
- Is it writing a CLI response to stdout, stderr, a file, or exiting after writing? → cli-response-writer
- Is it creating the generic response object? → cli-response-formatter
