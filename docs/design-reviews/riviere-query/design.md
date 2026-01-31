# Design Review: riviere-query

## Package Overview

**Purpose:** Browser-safe query library for exploring and analyzing Riviere architecture graphs.

**Dependencies:**
- `@living-architecture/riviere-schema` - Schema definitions
- `zod` - Runtime type validation

## Current Structure

```text
packages/riviere-query/src/
  index.ts                    # Public exports
  RiviereQuery.ts             # Main facade class
  component-queries.ts        # Component filtering/search
  domain-queries.ts           # Domain and entity queries
  flow-queries.ts             # Flow tracing and entry points
  event-queries.ts            # Event and handler queries
  cross-domain-queries.ts     # Cross-domain link analysis
  external-system-queries.ts  # External system aggregation
  graph-validation.ts         # Structural validation
  graph-diff.ts               # Graph comparison
  stats-queries.ts            # Aggregate statistics
  depth-queries.ts            # Node depth calculation
  domain-types.ts             # Type definitions + branded type parsers
  event-types.ts              # Event-related types + Entity class
  errors.ts                   # Error classes
  riviere-graph-fixtures.ts   # Test fixtures
```

## Separation of Concerns Checklist

### 1. Verify features/, platform/, shell/ exist at root

**Status:** FAIL

The package has a flat `src/` structure with no vertical/horizontal organization. This is a small, focused library package (query-only, no I/O, no external services), so the full features/platform/shell structure may be overkill. However, the current flat structure mixes different concerns.

### 2. Verify platform/ contains only domain/ and infra/

**Status:** N/A (no platform/ folder exists)

### 3. Verify each feature contains only entrypoint/, use-cases/, domain/

**Status:** N/A (no features/ folder exists)

### 4. Verify shell/ contains no business logic

**Status:** N/A (no shell/ folder exists)

### 5. Verify code belonging to one feature is in features/[feature]/

**Status:** FAIL

Query capabilities are scattered across files by technical concern rather than grouped by what they query:
- Domain querying split across: `domain-queries.ts`, `domain-types.ts`
- Event querying split across: `event-queries.ts`, `event-types.ts`
- Flow querying in: `flow-queries.ts`, `depth-queries.ts`

### 6. Verify shared business logic is in platform/domain/

**Status:** N/A

No shared business logic exists - this is a pure query library.

### 7. Verify external service wrappers are in platform/infra/

**Status:** PASS

No external services exist. This package is browser-safe with no I/O.

### 8. Verify custom folders are inside domain/, not use-cases/

**Status:** N/A

No custom folders exist.

### 9. Verify each function relies on same state as others in its class/file

**Status:** MIXED

**PASS:**
- `component-queries.ts` - All functions operate on `RiviereGraph.components`
- `graph-validation.ts` - All functions validate graph structure
- `graph-diff.ts` - All functions compare two graphs
- `stats-queries.ts` - Single function computing stats
- `errors.ts` - Single error class

**FAIL:**
- `domain-types.ts` - Mixes interface definitions (data shapes) with branded type parser functions (behavior). Different reasons to change: schema evolution vs parsing logic.
- `event-types.ts` - Mixes interface definitions with the `Entity` class. The `Entity` class has behavior (`hasStates()`, `hasBusinessRules()`, `firstOperationId()`), while interfaces are pure data.
- `flow-queries.ts` - Contains both flow tracing (`traceFlowFrom`, `queryFlows`) and search with flow context (`searchWithFlowContext`). The search function depends on component search results + flow tracing, while pure flow functions only depend on graph structure.

### 10. Verify each file name relates to other files in its directory

**Status:** MIXED

Most files follow a `*-queries.ts` or `*-types.ts` pattern, which is logical. However:
- `RiviereQuery.ts` breaks the pattern (PascalCase vs kebab-case)
- `riviere-graph-fixtures.ts` is test infrastructure mixed with production code

### 11. Verify each directory name describes what all files inside have in common

**Status:** N/A

Only one directory (`src/`) exists.

### 12. Verify use-cases/ contains only use-case files

**Status:** N/A

No use-cases/ folder exists.

### 13. Verify no generic type-grouping files spanning multiple capabilities

**Status:** FAIL

- `domain-types.ts` (365 lines) defines types for: component IDs, links, entities, domains, validation, diffs, flows, cross-domain links, stats, external domains. These are used by different query modules and change for different reasons.
- `event-types.ts` (125 lines) defines types for: entities, transitions, events, handlers. Mixes entity concepts with event concepts.

### 14. Verify entrypoint/ is thin

**Status:** PARTIAL PASS

`RiviereQuery.ts` acts as the facade/entrypoint. It is thin in that it delegates all work to query modules. However, it does contain:
- Graph validation in constructor (`assertValidGraph`)
- Direct graph access methods (`components()`, `links()`, `externalLinks()`)

## Identified Issues

### Issue 1: Mixed Concerns in domain-types.ts

**Principle violated:** Separate functions that depend on different state (Principle 4), No generic type-grouping files (Checklist 13)

**Current state:** `domain-types.ts` contains:
1. Branded type schemas and parsers (11 different types)
2. Validation interfaces
3. Domain interfaces
4. Diff interfaces
5. Flow interfaces
6. Cross-domain interfaces
7. Stats interfaces
8. External domain interfaces

**Impact:** Changes to flow types require modifying the same file as changes to validation types. No cohesion around why things change together.

**Recommended split:**
- `branded-types.ts` - All branded type definitions and parsers
- `validation-types.ts` - ValidationError, ValidationResult
- `diff-types.ts` - ComponentModification, DiffStats, GraphDiff
- `flow-types.ts` - FlowStep, Flow, SearchWithFlowResult
- `domain-analysis-types.ts` - Domain, ComponentCounts, CrossDomainLink, DomainConnection
- `stats-types.ts` - GraphStats, ExternalDomain

### Issue 2: Entity Class in event-types.ts

**Principle violated:** Separate functions that depend on different state (Principle 4), Separate functions with unrelated names (Principle 5)

**Current state:** `event-types.ts` contains:
1. `Entity` class with behavior methods
2. `EntityTransition` interface
3. Event-related interfaces (EventSubscriber, PublishedEvent, EventHandlerInfo)

**Impact:** Entity and Event are distinct domain concepts. Entity is about state machines and operations. Events are about pub/sub. They change for different reasons.

**Recommended split:**
- `entity.ts` - Entity class and EntityTransition
- `event-types.ts` - Event-related interfaces only

### Issue 3: Search Mixed with Flow in flow-queries.ts

**Principle violated:** Separate intent from execution (Principle 3), Separate functions that depend on different state (Principle 4)

**Current state:** `searchWithFlowContext` combines:
1. Component searching (depends on `searchComponents`)
2. Flow tracing (depends on `traceFlowFrom`)

**Impact:** Function orchestrates two distinct operations. Changes to search logic require touching flow-queries.ts.

**Recommendation:** Keep `searchWithFlowContext` where it is but recognize it as an orchestration function (use-case-like). If the package grows, consider:
- `search-queries.ts` for search functions
- `flow-queries.ts` for pure flow functions
- `search-with-flow.ts` for the combined operation

### Issue 4: Test Fixtures in Production Source

**Principle violated:** Separation of test infrastructure from production code

**Current state:** `riviere-graph-fixtures.ts` exists in `src/`

**Impact:** Test fixtures are bundled with production code.

**Recommendation:** Move to `src/__fixtures__/` or a dedicated test utilities location.

### Issue 5: Flat Structure Lacks Discoverability

**Principle violated:** Each directory name describes what all files inside have in common (Checklist 11)

**Current state:** 14 files in flat `src/` directory

**Impact:** No grouping indicates which files relate to which query capabilities.

**Recommendation:** For a small query library, a flat structure is acceptable but types should be co-located with their query modules:

```text
src/
  index.ts
  RiviereQuery.ts
  errors.ts
  branded-types.ts         # Shared branded types
  queries/
    component-queries.ts
    domain-queries.ts
    domain-types.ts        # Domain-specific types
    flow-queries.ts
    flow-types.ts          # Flow-specific types
    event-queries.ts
    event-types.ts         # Event-specific types
    cross-domain-queries.ts
    external-system-queries.ts
    graph-validation.ts
    graph-diff.ts
    stats-queries.ts
    depth-queries.ts
  entity/
    Entity.ts
    entity-types.ts
```

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| features/platform/shell structure | N/A | Overkill for query-only library |
| Feature grouping | FAIL | Flat structure mixes concerns |
| External services isolated | PASS | No external services |
| Same-state cohesion | MIXED | Some files mix unrelated state |
| Related names | MIXED | domain-types.ts spans many concepts |
| No generic type files | FAIL | domain-types.ts is a grab-bag |
| Thin entrypoint | PASS | RiviereQuery delegates correctly |

## Priority Recommendations

1. **High:** Split `domain-types.ts` into cohesive type modules
2. **High:** Extract `Entity` class from `event-types.ts`
3. **Medium:** Move test fixtures out of production source
4. **Low:** Consider light folder structure for discoverability

The package is well-designed as a query library - the `RiviereQuery` facade provides clean API, query functions are appropriately separated, and there are no external dependencies. The main issue is that type definitions have accumulated into grab-bag files rather than being co-located with their query modules.
