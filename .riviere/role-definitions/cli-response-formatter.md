# cli-response-formatter

## Purpose
A function that creates the generic CLI response envelope for success or error output.

## Behavioral Contract
1. Accept already-decided response content such as result data, warnings, error code, message, or suggestions
2. Return the standard CLI response object shape
3. Does NOT know about one specific CLI command result shape
4. Does NOT write to stdout, stderr, files, or exit the process
5. Does NOT handle thrown errors

## Examples

### Canonical Example
```typescript
/** @riviere-role cli-response-formatter */
export function formatSuccess<T>(data: T, warnings: string[] = []): SuccessOutput<T> {
  return { success: true, data, warnings }
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a cli-output-formatter**: output formatters decide entrypoint-specific presentation; response formatters only create the generic response envelope
- **Not a cli-response-writer**: response writers perform output side effects

### Mixed Responsibility Signals
- If the function writes to stdout, stderr, or a file — response writing is leaking in
- If the function switches on a specific command result — entrypoint output formatting is leaking in

## Decision Guidance
- Is it creating the shared CLI `success/error` response object shape? → cli-response-formatter
- Is it writing that response anywhere? → cli-response-writer
- Is it deciding how one command result appears to the user? → cli-output-formatter
