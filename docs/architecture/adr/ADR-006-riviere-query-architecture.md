# ADR-006: riviere-query Architecture

**Status:** Accepted
**Date:** 2026-01-28
**Deciders:** @ntcoding

## Context

`riviere-query` is a browser-safe library for querying Riviere architecture graphs. It provides read-only query capabilities over `RiviereGraph` structures. The current implementation has:
- Flat `src/` structure with ~15 production files
- `RiviereQuery.ts` facade at 666 lines (violates 400-line limit)
- `Entity` class misplaced in `event-types.ts`
- `domain-types.ts` as a 364-line grab-bag of unrelated types
- Duplicated `createLinkKey` function in `flow-queries.ts` and `graph-diff.ts`
- `ENTRY_POINT_TYPES` as magic inline constant
- Test fixtures in production source

## Decision

### 1. Query Libraries Use queries/ Not domain/

This is a pure query library—there is no domain logic. The library provides read-only query capabilities over an external domain model (Riviere schema).

**Structure for query libraries:**
```text
src/
├── queries/          # All query logic
├── platform/         # Shared utilities, test fixtures
└── index.ts          # Public API exports
```

Use `queries/` instead of `domain/` because that's what this library IS—queries. Aligns with ADR-003's `queries/` concept for read operations.

### 2. Package Structure

```text
src/
├── queries/
│   ├── riviere-query.ts
│   ├── component-queries.ts
│   ├── domain-queries.ts
│   ├── flow-queries.ts
│   ├── flow-types.ts
│   ├── flow-constants.ts
│   ├── event-queries.ts
│   ├── event-types.ts
│   ├── entity.ts
│   ├── cross-domain-queries.ts
│   ├── external-system-queries.ts
│   ├── graph-validation.ts
│   ├── validation-types.ts
│   ├── graph-diff.ts
│   ├── diff-types.ts
│   ├── stats-queries.ts
│   ├── stats-types.ts
│   ├── depth-queries.ts
│   ├── branded-types.ts
│   ├── link-key.ts
│   └── errors.ts
├── platform/
│   └── __fixtures__/
│       └── riviere-graph-fixtures.ts
└── index.ts
```

### 3. Split RiviereQuery Facade

The `RiviereQuery.ts` facade is 666 lines—over the 400-line limit. Split into focused query classes:

```typescript
export class RiviereQuery {
  readonly components: ComponentQueries
  readonly flows: FlowQueries
  readonly domains: DomainQueries
  readonly events: EventQueries
  readonly validation: ValidationQueries
  readonly diff: DiffQueries
  readonly stats: StatsQueries

  constructor(graph: RiviereGraph) {
    assertValidGraph(graph)
    this.components = new ComponentQueries(graph)
    this.flows = new FlowQueries(graph)
    // ...
  }
}
```

Each focused query class stays under 400 lines. Consumers access `query.components.byId(id)` or `query.flows.trace(componentId)`.

### 4. Extract Entity from event-types.ts

`Entity` class has nothing to do with events—it models domain entities with operations, states, transitions, and business rules. Move to `entity.ts` along with `EntityTransition`.

`event-types.ts` keeps only event-related interfaces: `EventSubscriber`, `PublishedEvent`, `EventHandlerInfo`.

### 5. Split domain-types.ts

The 364-line grab-bag violates co-location principles. Split by concept:

| Original | New File | Contents |
|----------|----------|----------|
| domain-types.ts | branded-types.ts | ComponentId, LinkId, EntityName, DomainName, State, OperationName parsers |
| domain-types.ts | validation-types.ts | ValidationError, ValidationResult |
| domain-types.ts | diff-types.ts | ComponentModification, DiffStats, GraphDiff |
| domain-types.ts | flow-types.ts | FlowStep, Flow, SearchWithFlowResult |
| domain-types.ts | stats-types.ts | GraphStats, ExternalDomain, ComponentCounts |

### 6. Extract Duplicated createLinkKey

The `createLinkKey` function is duplicated in `flow-queries.ts` and `graph-diff.ts`. Extract to `link-key.ts`:

```typescript
export function createLinkKey(link: Link): string {
  return link.id ?? `${link.source}->${link.target}`
}
```

### 7. Export ENTRY_POINT_TYPES as Named Constant

The entry point definition is implicit domain knowledge buried in `findEntryPoints`. Extract to `flow-constants.ts`:

```typescript
export const ENTRY_POINT_TYPES: ReadonlySet<ComponentType> = new Set([
  'UI', 'API', 'EventHandler', 'Custom'
])
```

### 8. Move Test Fixtures to platform/

`riviere-graph-fixtures.ts` is test infrastructure in production source. Move to `platform/__fixtures__/`.

## Consequences

### Positive

- Query library pattern established (`queries/` instead of `domain/`)
- Facade under 400 lines via focused query classes
- Entity correctly separated from events
- Types co-located with their query modules
- No code duplication (createLinkKey extracted)
- Implicit domain knowledge made explicit (ENTRY_POINT_TYPES)
- Test fixtures separated from production code

### Negative

- Breaking API change (consumers use `query.components.byId()` instead of `query.componentById()`)
- More files in queries/ folder
- Migration effort

### Enforcement

Structural and dependency rules are enforced by dependency-cruiser (`.dependency-cruiser.mjs`). Run `pnpm depcruise` to check violations.

### Mitigations

- Provide migration guide for API changes
- Flat structure within queries/ keeps navigation simple
- Focused query classes are easier to test and maintain

## Alternatives Considered

### Keep Flat src/ Structure

**Why rejected:** Violates library structure conventions. Libraries must have either `domain/` or `queries/` plus `platform/`, not a flat `src/`.

### Create domain/ Folder

**Why rejected:** This is a pure query library with no domain logic. Using `domain/` would misrepresent what the library does. `queries/` accurately describes the library's purpose.

### Keep domain-types.ts as Single File

**Why rejected:** 364-line grab-bag spanning branded types, validation, diffs, flows, and stats violates co-location principle. Types should live with the queries that use them.

### Keep RiviereQuery as Single 666-Line Facade

**Why rejected:** Violates 400-line limit. Split into focused query classes that each stay under the limit.
