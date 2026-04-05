# query-model

## Purpose
A class that holds immutable state and exposes read-only query methods — the read-side counterpart of an aggregate.

## Behavioral Contract
A query model:
1. **Holds immutable state** — the data it wraps is not modified after construction
2. **Exposes read-only methods** — public methods compute and return results without side effects
3. **Validates on construction** — may validate input data (e.g., schema validation), but this is data integrity, not domain invariant enforcement
4. **Is loaded through a query-model-loader** — never created ad-hoc in use cases
5. **Is never saved** — query models are read-only; there is no persistence of modified state

## Examples

### Canonical Example
```typescript
/** @riviere-role query-model */
export class RiviereQuery {
  private readonly graph: RiviereGraph

  constructor(graph: RiviereGraph) {
    assertValidGraph(graph)
    this.graph = graph
  }

  domains(): Domain[] {
    return queryDomains(this.graph)
  }

  componentsByType(type: ComponentType): Component[] {
    return filterByType(this.graph, type)
  }
}
```

### Edge Cases
- A query model with many public methods (facade pattern) is valid
- A query model that delegates to pure query functions is the canonical pattern
- Static factory methods (e.g., `fromJSON`) are valid

## Anti-Patterns

### Common Misclassifications
- **Not an aggregate**: Aggregates enforce behavioral invariants and expose methods that modify state. If no method modifies state, it is a query-model.
- **Not a domain-service**: Domain services are stateless functions. Query models hold state.
- **Not a value-object**: Value objects are simple data structures. Query models have behavior (query methods).

### Mixed Responsibility Signals
- If any public method modifies the internal state — it may be an aggregate, not a query model
- If the class makes I/O calls (file reads, HTTP requests) — infrastructure is leaking in
- If the class formats output for display — cli-output-formatter responsibility

## Decision Guidance
- **vs aggregate**: Does any method modify state? → aggregate. All methods read-only? → query-model. **When uncertain, ask the user — do not default to aggregate.**
- **vs domain-service**: Does it hold state? → query-model. Stateless function operating on passed-in data? → domain-service
- **vs value-object**: Does it expose query methods with behavior? → query-model. Simple data with no behavior? → value-object

## References
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html) — Read models in CQRS
- ADR-002: queries/ layer handles read operations with minimal layering
