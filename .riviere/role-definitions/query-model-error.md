# query-model-error

## Purpose
A custom error class for exceptional conditions in the query model layer.

## Behavioral Contract
1. Extends `Error`
2. Represents a query-specific error condition (e.g., component not found, invalid query)
3. Lives in the `/queries` layer alongside query-model types
4. Provides a descriptive error message with context for debugging

## Examples

### Canonical Example
```typescript
/** @riviere-role query-model-error */
export class ComponentNotFoundError extends Error {
  constructor(componentId: string) {
    super(`Component not found: ${componentId}`)
    this.name = 'ComponentNotFoundError'
  }
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a domain-error**: domain errors live in the `/domain` layer and relate to domain invariant violations. Query model errors relate to query operations.
- **Not a cli-error**: CLI errors handle presentation-layer error formatting. Query model errors are thrown by query logic.

## Decision Guidance
- **vs domain-error**: Is this error thrown during query model operations? → query-model-error. Is it thrown during domain behavior or aggregate invariant enforcement? → domain-error
- **vs cli-error**: Is this error about query logic? → query-model-error. Is it about CLI presentation? → cli-error
