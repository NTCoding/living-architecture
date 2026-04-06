# query-model

## Purpose
A class, interface, or type that represents the read-side model — the counterpart of an aggregate on the write side. Includes the query model class itself and the types it returns.

## Behavioral Contract

### As a class
1. **Holds immutable state** — the data it wraps is not modified after construction
2. **Exposes read-only methods** — public methods compute and return results without side effects
3. **Validates on construction** — may validate input data (e.g., schema validation), but this is data integrity, not domain invariant enforcement
4. **Is loaded through a query-model-loader** — never created ad-hoc in use cases
5. **Is never saved** — query models are read-only; there is no persistence of modified state

### As an interface or type alias
Represents a result shape returned by query model methods. These are the types that flow out of the query model to consumers.

## Examples

### Query Model Class
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
}
```

### Query Model Result Type
```typescript
/** @riviere-role query-model */
export interface Domain {
  name: string
  componentCounts: ComponentCounts
}

/** @riviere-role query-model */
export type DomainSummary = ReturnType<RiviereQuery['domains']>[number]
```

### Edge Cases
- A query model class with many public methods (facade pattern) is valid
- A query model class that delegates to pure functions is the canonical pattern
- Static factory methods (e.g., `fromJSON`) are valid
- Branded types used by the query model (e.g., `ComponentId`) are valid

## Anti-Patterns

### Common Misclassifications
- **Not an aggregate**: Aggregates enforce behavioral invariants and expose methods that modify state. If no method modifies state, it is a query-model.
- **Not a domain-service**: Domain services are stateless functions. Query model classes hold state.
- **Not a value-object**: Value objects are reusable domain concepts in the `/domain` layer. Query model types live in the `/queries` layer.

### Mixed Responsibility Signals
- If any public method modifies the internal state — it may be an aggregate, not a query model
- If the class makes I/O calls (file reads, HTTP requests) — infrastructure is leaking in
- If the class formats output for display — cli-output-formatter responsibility

## Decision Guidance
- **vs aggregate**: Does any method modify state? → aggregate. All methods read-only? → query-model
- **vs domain-service**: Does it hold state? → query-model. Stateless function operating on passed-in data? → domain-service
- **vs value-object**: Does it live in `/queries`? → query-model. Does it live in `/domain`? → value-object

## References
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html) — Read models in CQRS
- ADR-002: queries/ layer handles read operations with minimal layering
