# domain-error

## Purpose
A typed error class representing a domain-specific failure — a named outcome that domain logic can produce and callers can handle explicitly.

## Behavioral Contract
1. Extends `Error` (or a base domain error class)
2. Carries only information relevant to the domain failure — no infrastructure concerns
3. Named after the specific failure it represents, not a generic `Error` suffix

## Examples

### Canonical Example
```typescript
/** @riviere-role domain-error */
export class ProjectNotFoundError extends Error {
  constructor(readonly projectId: string) {
    super(`Project not found: ${projectId}`)
    this.name = 'ProjectNotFoundError'
  }
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a cli-error**: domain errors represent domain failures; cli errors represent presentation-layer failures (e.g., invalid CLI arguments)
- **Not an external-client-error**: domain errors are thrown by domain logic; external client errors are thrown by infrastructure adapters

### Mixed Responsibility Signals
- Contains infrastructure details (HTTP status codes, SQL error codes) — belongs in external-client-error instead
- Used for validation of primitive inputs — use a value-object with fail-fast validation instead

## Decision Guidance
- **vs cli-error**: Is it thrown by domain logic? → domain-error. Is it thrown by CLI argument parsing? → cli-error
- **vs external-client-error**: Does it represent a domain concept? → domain-error. Does it represent an infrastructure failure? → external-client-error
