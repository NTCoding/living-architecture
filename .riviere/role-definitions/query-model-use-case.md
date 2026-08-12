# query-model-use-case

## Purpose
A class that orchestrates one read-only operation by loading and returning its concrete query model without side effects. Dependencies are injected via constructor.

## Behavioral Contract
A query model use case class has exactly one public method (`execute`) that follows this sequence:
1. **Translate** — translate the use-case input into criteria for its query-model-loader
2. **Load** — use the injected loader to build the concrete query model
3. **Return** — return that query model directly

No state is modified. No saving occurs. The query model is never mutated.

The `execute` method accepts exactly one parameter typed as a `query-model-use-case-input`.

## Examples

### Canonical Example
```typescript
/** @riviere-role query-model-use-case */
export class ListComponents {
  constructor(private readonly components: ComponentListLoader) {}

  execute(input: ListComponentsInput): ComponentList {
    return this.components.load(input.graphPath, input.domain, input.type)
  }
}
```

### Edge Cases
- A query that calls multiple methods on the same query model is valid
- A query that composes results from multiple query model methods is valid
- A use case may map known loader failures into query-use-case errors
- A use case may coordinate multiple loaders when the concrete read genuinely needs them

## Anti-Patterns

### Common Misclassifications
- **Not a command-use-case**: commands orchestrate write operations that may modify and save state. If nothing is modified or saved, use query-model-use-case.
- **Not a domain-service**: domain services contain reusable domain logic. If it coordinates loading a concrete read from persistence, it is a query-model-use-case.
- **Not a cli-entrypoint**: entrypoints translate external input into query-model-use-case-input and call the use case. They do not load query models.

### Mixed Responsibility Signals
- If the function modifies state or saves anything — it is a command-use-case, not a query
- If the function formats output for display — cli-output-formatter responsibility leaking in
- If the function constructs the input from CLI flags — command-input-factory responsibility leaking in
- Instantiating query-model-loaders with `new` inside the execute method — dependencies must be constructor-injected

## Decision Guidance
- **vs command-use-case**: Does it modify or save state? → command-use-case. Read-only with no side effects? → query-model-use-case
- **vs domain-service**: Does it coordinate loading a concrete read from persistence? → query-model-use-case. Reusable domain logic on passed-in data? → domain-service

## References
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html) — Commands vs queries separation
- ADR-002: queries/ layer has minimal layering, no state changes
