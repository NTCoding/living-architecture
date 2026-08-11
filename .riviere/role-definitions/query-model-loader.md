# query-model-loader

## Purpose
A class that loads a concrete query model for one read use case from persisted state — the read-only counterpart of an aggregate-repository.

## Behavioral Contract
1. **Load** — assemble the query model for a concrete query use case from persisted state (files, database, APIs) and return it
2. The loader MUST return that concrete query model, not raw persisted state or a reusable domain service
3. May use external-client-services internally to access storage or parsers
4. **No save method** — query model loaders are strictly read-only

## Examples

### Canonical Example
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

## Anti-Patterns

### Common Misclassifications
- **Not an aggregate-repository**: Aggregate repositories handle both loading AND saving of aggregates. If the class only loads and never saves, and the thing it loads is a query-model, use query-model-loader.
- **Not an external-client-service**: Loaders assemble query models from raw data. External client services provide single technical capabilities.
- **Not a query-model-use-case**: Loaders only handle loading. Use cases orchestrate load → query → return.

### Mixed Responsibility Signals
- If the loader has a save/persist method — it may be an aggregate-repository
- If reusable domain behaviour is needed to shape the read — call the domain service while building the query model; do not return the domain service as the query model

## Decision Guidance
- **vs aggregate-repository**: Does it save state? → aggregate-repository. Load only, returning a query-model? → query-model-loader
- **vs external-client-service**: Does it return a query-model? → query-model-loader. Does it return raw data? → external-client-service
- **vs query-model-use-case**: Does it only load? → query-model-loader. Does it orchestrate load + query + return? → query-model-use-case
