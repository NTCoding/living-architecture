# query-model-loader

## Purpose
A class that loads a query model from persisted state — the read-only counterpart of an aggregate-repository.

## Behavioral Contract
1. **Load** — assemble the query model from persisted state (files, database, APIs) and return it
2. The loader MUST return a query-model, not raw data or partial state
3. May use external-client-services internally to access storage or parsers
4. **No save method** — query model loaders are strictly read-only

## Examples

### Canonical Example
```typescript
/** @riviere-role query-model-loader */
export class RiviereQueryLoader {
  load(graphPathOption?: string): RiviereQuery {
    const graphPath = this.resolveGraphPath(graphPathOption)
    const content = readFileSync(graphPath, 'utf-8')
    const parsed: unknown = JSON.parse(content)
    return RiviereQuery.fromJSON(parsed)
  }
}
```

### Edge Cases
- A loader may have multiple load methods for different access patterns
- Private helper methods are implementation details, not separate roles

## Anti-Patterns

### Common Misclassifications
- **Not an aggregate-repository**: Aggregate repositories handle both loading AND saving of aggregates. If the class only loads and never saves, and the thing it loads is a query-model, use query-model-loader.
- **Not an external-client-service**: Loaders assemble query models from raw data. External client services provide single technical capabilities.
- **Not a query-model-use-case**: Loaders only handle loading. Use cases orchestrate load → query → return.

### Mixed Responsibility Signals
- If the loader has a save/persist method — it may be an aggregate-repository
- If the loader returns raw data instead of a query model — it may be an external-client-service
- If the loader performs business logic after loading — that belongs on the query model

## Decision Guidance
- **vs aggregate-repository**: Does it save state? → aggregate-repository. Load only, returning a query-model? → query-model-loader
- **vs external-client-service**: Does it return a query-model? → query-model-loader. Does it return raw data? → external-client-service
- **vs query-model-use-case**: Does it only load? → query-model-loader. Does it orchestrate load + query + return? → query-model-use-case
