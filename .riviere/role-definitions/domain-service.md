# domain-service

## Purpose
A function or class that contains domain business logic that doesn't naturally belong on a single aggregate.

## Behavioral Contract
1. Accepts domain objects (aggregates, value objects) as parameters
2. Performs business logic — transformations, calculations, validations
3. Returns domain objects or primitive results
4. Has NO side effects — does not load from or save to repositories, does not call external services
5. Is pure: same inputs always produce same outputs

## Examples

### Canonical Example
```typescript
/** @riviere-role domain-service */
export function detectConnections(
  components: DraftComponent[],
  sourceFiles: SourceFile[],
): Connection[] {
  // pure domain logic analyzing components and source files
}
```

### Edge Cases
- Validation functions that check domain rules
- Transformation functions that map between domain types
- Calculation functions that derive new domain values

## Anti-Patterns

### Common Misclassifications
- **Not a command-use-case**: if it loads from a repository or saves results, it's orchestrating — that's a command
- **Not an external-client-service**: if it calls external libraries, it belongs in infrastructure
- **Not a command-input-factory**: if it transforms CLI options, it's a factory

### Mixed Responsibility Signals
- If the function accesses the file system, database, or network — infrastructure leaking in
- If the function creates repositories or loads state — command-use-case behavior leaking in
- If the function has side effects — either move side effects out or reclassify

## Decision Guidance
- **vs command-use-case**: Does it load/save state? → command-use-case. Is it pure logic? → domain-service
- **vs aggregate method**: Does the logic naturally belong to one aggregate's state? → aggregate method. Does it operate across multiple domain objects? → domain-service
- **vs external-client-service**: Does it call external libraries? → external-client-service. Does it only operate on domain types? → domain-service
