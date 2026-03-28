# external-client-service

## Purpose
A function that wraps a third-party library or external tool behind a project-controlled boundary.

## Behavioral Contract
1. Accept domain-meaningful parameters (not raw library types)
2. Call the external library/tool
3. Return domain-meaningful results or library-specific types that are used by repositories or other infrastructure

These functions isolate external dependencies so that:
- The rest of the codebase does not depend directly on external APIs
- External libraries can be swapped without changing domain code

## Examples

### Canonical Example
```typescript
/** @riviere-role external-client-service */
export function createConfiguredProject(projectPath: string): Project {
  return new Project({
    tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: false,
  })
}
```

### Edge Cases
- Functions wrapping git CLI operations
- Functions wrapping file system operations that use specific external libraries
- Functions that configure and return instances of external libraries

## Anti-Patterns

### Common Misclassifications
- **Not an aggregate-repository**: repositories orchestrate loading/saving of aggregates. External client services are lower-level technical helpers.
- **Not a domain-service**: domain services contain business logic. External client services contain integration code.

### Mixed Responsibility Signals
- If the function does domain logic WITH external calls — split into domain-service + external-client-service
- If the function assembles an aggregate from multiple sources — that's aggregate-repository behavior
- If the function contains business rules about what to load — domain logic leaking into infrastructure

## Decision Guidance
- **vs aggregate-repository**: Does it assemble a full aggregate? → aggregate-repository. Does it provide a single technical capability? → external-client-service
- **vs domain-service**: Does it call external libraries? → external-client-service. Does it only operate on domain types? → domain-service
