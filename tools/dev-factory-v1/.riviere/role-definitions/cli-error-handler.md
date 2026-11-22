# cli-error-handler

## Purpose
A function that handles uncaught exceptions at the CLI boundary.

## Behavioral Contract
1. Accept an unknown thrown error from CLI execution
2. Convert only CLI-boundary or infrastructure exceptions that genuinely escaped normal control flow into CLI responses
3. Rethrow unknown errors
4. Does NOT depend on domain types
5. Does NOT handle regular use-case failure control flow

## Examples

### Canonical Example
```typescript
/** @riviere-role cli-error-handler */
export function handleGlobalError(error: unknown): never {
  if (error instanceof ConfigValidationError) {
    exitWithCliError(error.errorCode, error.message, ExitCode.ConfigValidation)
  }
  throw error
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a cli-output-formatter**: output formatters present typed command/query results
- **Not a cli-response-writer**: response writers write already-created CLI responses
- **Not a domain-error**: error handlers are behavior, not error definitions

### Mixed Responsibility Signals
- If the handler imports domain errors — regular use-case failure control flow is leaking into CLI exception handling
- If the handler handles expected command/query results — result presentation belongs in the entrypoint output path

## Decision Guidance
- Is it catching uncaught CLI-boundary exceptions and rethrowing unknown errors? → cli-error-handler
- Is it handling expected use-case failures? → return typed use-case results and format them through cli-output-formatter
