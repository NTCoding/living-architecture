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

### Design from a concrete query

Use case: a user runs:

```text
riviere components --domain payments --type API
```

`ListComponents` must return only API components from the `payments` domain.

The query model for that use case is the component list:

```typescript
/** @riviere-role query-model */
export interface ComponentList {
  components: Component[]
}
```

The loader builds that model specifically for the requested read:

```typescript
/** @riviere-role query-model-loader */
export class ComponentListLoader {
  load(criteria: ComponentListCriteria): ComponentList {
    const graph = this.loadGraph(criteria.graphPath)
    const query = new RiviereQuery(graph)

    return {
      components: filterComponents(query.components(), criteria),
    }
  }
}
```

The use case translates its input into loader criteria and returns the loaded model:

```typescript
/** @riviere-role query-model-use-case */
export class ListComponents {
  constructor(private readonly components: ComponentListLoader) {}

  execute(input: ListComponentsInput): ComponentList {
    return this.components.load({
      graphPath: input.graphPath,
      domain: input.domain,
      type: input.type,
    })
  }
}
```

Bad:

```typescript
export class RiviereQueryRepository {
  load(): RiviereQuery
}
```

The persisted state is a graph. `RiviereQuery` is domain behaviour used to build the query-specific `ComponentList`; it is not itself the query model.

Also bad:

```typescript
export class GraphQueryModel {}
```

There is no user query called “query graph”. This generic model hides the actual use case and prevents the read from being shaped around what `ListComponents` needs.

### Edge Cases
- Usually there is one query model per query use case because each read can be shaped and optimised independently
- Share a query model only when concrete use cases genuinely need the same read shape
- Query models may import the domain objects and behaviour needed to build that read
- Do not add `Model` or `QueryModel` suffixes; the role annotation already states the technical classification

## Anti-Patterns

### Common Misclassifications
- **Not an aggregate**: Aggregates enforce behavioral invariants and expose methods that modify state. If no method modifies state, it is a query-model.
- **Not a domain-service**: A domain service provides reusable domain behaviour. A query model is shaped for a concrete read use case.
- **Not a value-object**: Value objects are reusable domain concepts in the `/domain` layer. Query model types live in the `/queries` layer.

### Mixed Responsibility Signals
- If any public method modifies the internal state — it may be an aggregate, not a query model
- If the class makes I/O calls (file reads, HTTP requests) — infrastructure is leaking in
- If the class formats output for display — cli-output-formatter responsibility

## Decision Guidance
- **vs aggregate**: Does any method modify state? → aggregate. All methods read-only? → query-model
- **vs domain-service**: Is it reusable domain behaviour? → domain-service. Is it a read shaped for a concrete query use case? → query-model
- **vs value-object**: Does it live in `/queries`? → query-model. Does it live in `/domain`? → value-object

## References
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html) — Read models in CQRS
- ADR-002: queries/ layer handles read operations with minimal layering
