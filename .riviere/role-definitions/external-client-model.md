# external-client-model

## Purpose
A type that represents data structures from or for external services — the shapes that external-client-services accept or return.

## Behavioral Contract
This is a data structure. It:
1. Defines the contract between the codebase and an external service
2. May mirror external API shapes or represent configuration for external tools
3. Lives in the infrastructure layer alongside external-client-services

## Examples

### Canonical Example
```typescript
/** @riviere-role external-client-model */
export interface GitRepositoryInfo {
  repositoryRoot: string
  currentBranch: string
  remoteName: string
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a value-object**: value objects are domain concepts. External client models are infrastructure types.
- **Not a command-use-case-input**: inputs are for commands. Models are for external service boundaries.

### Mixed Responsibility Signals
- If the type contains both external service fields AND domain behavior fields — split into external model + domain type

## Decision Guidance
- **vs value-object**: Does it represent an external service's data shape? → external-client-model. Does it represent a domain concept? → value-object
