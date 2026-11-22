# external-client-error

## 🚨 CRITICAL NAMING RULE
**The name must describe the EXTERNAL TOOL/SERVICE that failed, not a domain concept.**

If the name uses vocabulary from the project's domain (the nouns that appear in `docs/architecture/domain-terminology/`, role names, aggregate names, or core feature names), then this role is wrong — the error belongs in `domain/` as a `domain-error`, not in `infra/external-clients/`.

- ✅ `OxlintSpawnError`, `StripeApiError`, `GitOperationError`, `FilesystemReadError`
- ❌ `RoleEnforcementExecutionError`, `OrderProcessingError`, `ExtractionFailure`

If you find yourself putting a domain noun in an `infra/external-clients/**` error name, STOP. The error belongs in `domain/` and is a `domain-error`.

## Purpose
An error class that represents failures from external services, providing structured error information for infrastructure boundaries.

## Behavioral Contract
1. Extend Error (or a base error class)
2. Capture external-service-specific failure details
3. Provide enough context for callers to handle or report the failure

## Examples

### Canonical Example
```typescript
/** @riviere-role external-client-error */
export class GitOperationError extends Error {
  constructor(
    public readonly operation: string,
    public readonly exitCode: number,
    message: string,
  ) {
    super(`Git ${operation} failed (exit ${exitCode}): ${message}`)
    this.name = 'GitOperationError'
  }
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a value-object**: error classes represent failure modes, not domain concepts
- **Not a domain-service error**: if the error originates from an external tool or library, it belongs here

### Mixed Responsibility Signals
- If the error class contains retry logic or recovery behavior — that belongs in the service or a higher layer

## Decision Guidance
- Is the error caused by an external tool/library failure? → external-client-error
- Is the error caused by a domain rule violation? → should be a domain error (may need a new role)
