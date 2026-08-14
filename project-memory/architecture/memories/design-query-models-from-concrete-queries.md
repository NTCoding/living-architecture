---
status: approved
dateAdded: 2026-08-11
systemAreas:
  - global
  - riviere-cli
architectureConcepts:
  - boundary-placement
  - component-responsibility
  - riviere-role-understanding
  - trade-off-reasoning
source: conversation: query-model design during role-enforcement architecture migration
---

# Design query models from concrete queries

## Memory

Start with the user query and its required result.

For example, when a user runs:

```text
riviere components --domain payments --type API
```

the `ListComponents` use case must return only API components from the `payments` domain. Its query model is therefore a component list shaped for that read, and its loader builds that list using the relevant domain objects and behaviour.

```typescript
/** @riviere-role query-model */
export interface ComponentList {
  components: Component[]
}

/** @riviere-role query-model-loader */
export class ComponentListLoader {
  load(criteria: ComponentListCriteria): ComponentList {
    const graph = this.loadGraph(criteria.graphPath)
    const query = new RiviereQuery(graph)
    return { components: filterComponents(query.components(), criteria) }
  }
}
```

Usually there is one query model per query use case because each read can be shaped and optimised independently. Share one only when concrete use cases genuinely need the same read shape.

Do not add `Model` or `QueryModel` suffixes. The role annotation already communicates that technical classification; name the type after the information it represents.

## Why this matters

Starting from an existing shared repository produced this incorrect design:

```typescript
/** @riviere-role query-model-loader */
export class RiviereQueryRepository {
  load(): RiviereQuery
}
```

The persisted state is a graph. `RiviereQuery` is domain behaviour used to build query-specific reads; returning it from a query-model loader does not make it a query model.

Trying to preserve that repository then produced another false abstraction:

```typescript
export class GraphQueryModel {}
```

There is no use case called “query graph”. The generic wrapper hid the actual queries and prevented their query models from being independently shaped.

## Consider this when

- Designing a query use case, query model, or query-model loader.
- An existing repository or loader returns a shared domain service.
- A proposed query model has a generic name unrelated to a user query.
- Several query use cases are being forced through one query model.

## Do not apply automatically when

- Concrete query use cases genuinely require the same read shape and sharing it keeps each use case clear.

## Clarify with the user when

- The user query and required result have not been stated concretely.
- A shared query model is proposed without examples of the use cases that share it.

## Related references

- `.riviere/role-definitions/query-model.md`
- `.riviere/role-definitions/query-model-loader.md`
- `.riviere/role-definitions/query-model-use-case.md`
- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
