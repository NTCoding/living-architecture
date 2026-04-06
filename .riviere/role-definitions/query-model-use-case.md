# query-model-use-case

## Purpose
A class that orchestrates a read-only operation: loading a query model and returning computed results without side effects. Dependencies are injected via constructor.

## Behavioral Contract
A query model use case class has exactly one public method (`execute`) that follows this sequence:
1. **Load** — use the injected query-model-loader to load the query model from persisted state
2. **Query** — call method(s) on the query model to compute results
3. **Return** — return query-model types directly

No state is modified. No saving occurs. The query model is never mutated.

The `execute` method accepts exactly one parameter typed as a `query-model-use-case-input`.

## Examples

### Canonical Example
```typescript
/** @riviere-role query-model-use-case */
export class ListDomains {
  constructor(private readonly repository: RiviereQueryRepository) {}

  execute(input: ListDomainsInput): ListDomainsResult {
    const query = this.repository.load(input.graphPathOption)
    return { domains: query.domains() }
  }
}
```

### Edge Cases
- A query that calls multiple methods on the same query model is valid
- A query that composes results from multiple query model methods is valid

## Anti-Patterns

### Common Misclassifications
- **Not a command-use-case**: commands orchestrate write operations that may modify and save state. If nothing is modified or saved, use query-model-use-case.
- **Not a domain-service**: domain services contain pure business logic. If it loads a query model from persistence, it is a query-model-use-case.
- **Not a cli-entrypoint**: entrypoints translate external input into query-model-use-case-input and call the use case. They do not load query models.

### Mixed Responsibility Signals
- If the function modifies state or saves anything — it is a command-use-case, not a query
- If the function formats output for display — cli-output-formatter responsibility leaking in
- If the function constructs the input from CLI flags — command-input-factory responsibility leaking in
- Instantiating query-model-loaders with `new` inside the execute method — dependencies must be constructor-injected

## Decision Guidance
- **vs command-use-case**: Does it modify or save state? → command-use-case. Read-only with no side effects? → query-model-use-case
- **vs domain-service**: Does it load a query model from persistence? → query-model-use-case. Pure logic on passed-in data? → domain-service

## References
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html) — Commands vs queries separation
- ADR-002: queries/ layer has minimal layering, no state changes
