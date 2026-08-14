# data-access-error

## Purpose

An error describing a failure while loading, reconstructing or persisting application state.

## Rules

- Lives in `data-access/{concept}/` beside the repository or loader that can return it.
- Describes a data-access failure, not a violated domain invariant.
- Contains no recovery workflow, presentation behaviour or external-client implementation.

## Canonical Example

```typescript
/** @riviere-role data-access-error */
export class GraphNotFoundError extends Error {
  constructor(readonly graphPath: string) {
    super(`Graph not found: ${graphPath}`)
  }
}
```

## Anti-Patterns

- Labelling domain validation failures as data-access errors.
- Throwing a generic data-access error when a typed result can preserve the concrete failure.
- Placing filesystem or database interaction inside the error class.
