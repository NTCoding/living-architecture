# Refined Design: riviere-query

## Package Overview

**Purpose:** Browser-safe query library for exploring and analyzing Riviere architecture graphs.

**Dependencies:**
- `@living-architecture/riviere-schema` - Schema definitions
- `zod` - Runtime type validation

## Refined Structure

```text
packages/riviere-query/src/
  index.ts                      # Public exports
  riviere-query.ts              # Main facade class (renamed from PascalCase)
  errors.ts                     # Error classes

  branded-types/
    component-id.ts             # ComponentId branded type + factory
    link-id.ts                  # LinkId branded type + factory
    entity-name.ts              # EntityName branded type + factory
    domain-name.ts              # DomainName branded type + factory
    state.ts                    # State branded type + factory
    operation-name.ts           # OperationName branded type + factory
    event-id.ts                 # EventId branded type + factory
    event-name.ts               # EventName branded type + factory
    handler-id.ts               # HandlerId branded type + factory
    handler-name.ts             # HandlerName branded type + factory
    index.ts                    # Re-exports all branded types

  component/
    component-queries.ts        # Component filtering/search

  domain/
    domain-queries.ts           # Domain and entity queries
    domain-types.ts             # Domain, ComponentCounts interfaces

  entity/
    entity.ts                   # Entity class with behavior
    entity-transition.ts        # EntityTransition interface

  event/
    event-queries.ts            # Event and handler queries
    event-types.ts              # PublishedEvent, EventSubscriber, EventHandlerInfo

  flow/
    flow-queries.ts             # Flow tracing and entry points
    flow-types.ts               # FlowStep, Flow, SearchWithFlowResult, LinkType
    entry-point-types.ts        # ENTRY_POINT_TYPES constant

  cross-domain/
    cross-domain-queries.ts     # Cross-domain link analysis
    cross-domain-types.ts       # CrossDomainLink, DomainConnection

  external/
    external-system-queries.ts  # External system aggregation
    external-types.ts           # ExternalDomain interface

  validation/
    graph-validation.ts         # Structural validation
    validation-types.ts         # ValidationError, ValidationResult, ValidationErrorCode

  diff/
    graph-diff.ts               # Graph comparison
    diff-types.ts               # ComponentModification, DiffStats, GraphDiff

  stats/
    stats-queries.ts            # Aggregate statistics
    stats-types.ts              # GraphStats interface

  depth/
    depth-queries.ts            # Node depth calculation
```

Test fixtures move out of production source:
```text
packages/riviere-query/test/
  fixtures/
    riviere-graph-fixtures.ts   # Test fixtures
```

## Separation of Concerns Analysis

### Principle 1: Separate external clients from domain-specific code

**Status: PASS**

No external clients exist. This is a pure query library operating on in-memory data structures.

### Principle 2: Separate feature-specific from shared capabilities

**Status: ADDRESSED**

Original issue: Types scattered across files spanning multiple capabilities.

Refined structure groups types with their query modules:
- `flow/flow-types.ts` with `flow/flow-queries.ts`
- `domain/domain-types.ts` with `domain/domain-queries.ts`
- `event/event-types.ts` with `event/event-queries.ts`

Branded types are truly shared across all modules, so they live in `branded-types/`.

### Principle 3: Separate intent from execution

**Status: PASS**

Query functions are appropriately abstracted:
```typescript
// Intent clear, execution details in helpers
export function queryFlows(graph: RiviereGraph): Flow[] {
  const componentByIdMap = new Map(graph.components.map((c) => [c.id, c]))
  const outgoingEdges = buildOutgoingEdges(graph)
  const externalLinksBySource = buildExternalLinksBySource(graph)

  return findEntryPoints(graph).map((entryPoint) => ({
    entryPoint,
    steps: traceForward(entryPoint.id),
  }))
}
```

### Principle 4: Separate functions that depend on different state

**Status: ADDRESSED**

Original violations:
- `domain-types.ts` mixed 11 unrelated type categories
- `event-types.ts` mixed Entity class with event interfaces

Refined structure separates by state dependency:
- Entity class depends on: operations, states, transitions, businessRules
- Event types depend on: eventName, handlers, subscriptions
- Flow types depend on: component, linkType, depth, externalLinks
- Validation types depend on: path, message, code

### Principle 5: Separate functions that don't have related names

**Status: ADDRESSED**

Original `domain-types.ts` contained unrelated names:
- `parseComponentId`, `ValidationError`, `Domain`, `FlowStep`, `GraphDiff`, `CrossDomainLink`, `GraphStats`

Refined structure groups related names:
- `branded-types/`: `ComponentId`, `LinkId`, `EntityName`...
- `flow/`: `FlowStep`, `Flow`, `SearchWithFlowResult`
- `diff/`: `ComponentModification`, `DiffStats`, `GraphDiff`
- `validation/`: `ValidationError`, `ValidationResult`

## Tactical DDD Analysis

### Principle 1: Isolate domain logic

**Status: PASS**

All code is pure domain query logic. No infrastructure concerns (logging, databases, HTTP) exist in the package.

### Principle 2: Use rich domain language

**Status: IMPROVED**

Changes:
1. Rename `parse*` to `brand*` or use static factory pattern
2. Explicit `ENTRY_POINT_TYPES` constant names the domain concept
3. File names use domain terminology

Before:
```typescript
export function parseComponentId(id: string): ComponentId
```

After:
```typescript
export const ComponentId = {
  from(id: string): ComponentId {
    return componentIdSchema.parse(id)
  }
}
```

### Principle 3: Orchestrate with use cases

**Status: N/A**

Library package, not application. No use cases to orchestrate.

### Principle 4: Avoid anemic domain model

**Status: ACCEPTABLE**

The `Entity` class has appropriate behavior:
```typescript
class Entity {
  hasStates(): boolean
  hasBusinessRules(): boolean
  firstOperationId(): string | undefined
}
```

Query result types (`Flow`, `PublishedEvent`, `Domain`) remain pure data interfaces. For a read-only query library, this is appropriate. These are query projections, not domain aggregates.

### Principle 5: Separate generic concepts

**Status: PASS**

No generic utilities mixed with domain logic. Zod usage is encapsulated in branded type factories.

### Principle 6: Make the implicit explicit

**Status: IMPROVED**

Implicit concepts now made explicit:

1. **Entry point definition**
```typescript
// Before: inline in findEntryPoints
const entryPointTypes = new Set(['UI', 'API', 'EventHandler', 'Custom'])

// After: named domain constant
// flow/entry-point-types.ts
export const ENTRY_POINT_TYPES: ReadonlySet<ComponentType> =
  new Set(['UI', 'API', 'EventHandler', 'Custom'] as const)
```

1. **Branded type semantics**
```typescript
// Before: "parse" suggests transformation
parseComponentId(id: string): ComponentId

// After: explicit branding operation
ComponentId.from(id: string): ComponentId
```

1. **Query result discriminated unions**
```typescript
// event-types.ts already uses this pattern well
export type SubscribedEventWithDomain = KnownSourceEvent | UnknownSourceEvent
```

### Principle 7: Design aggregates around invariants

**Status: N/A**

Read-only query library. No invariants to protect. The source graph comes from external systems.

### Principle 8: Extract immutable value objects liberally

**Status: ACCEPTABLE**

Branded types serve as lightweight value objects:
- `ComponentId`, `LinkId` - Identifier value objects
- `EntityName`, `DomainName` - Name value objects
- `State`, `OperationName` - Domain concept value objects

For a query library, branded primitives provide type safety without object allocation overhead.

## Implementation Priorities

### Phase 1: Extract Entity (Low Risk)

Move `Entity` class from `event-types.ts` to `entity/entity.ts`:
- Single file move
- No API changes
- Clear separation of entity concept from event concept

### Phase 2: Split domain-types.ts (Medium Risk)

Create focused type modules:
```text
branded-types/     <- all branded type definitions
validation/        <- ValidationError, ValidationResult
diff/              <- ComponentModification, DiffStats, GraphDiff
flow/              <- FlowStep, Flow, SearchWithFlowResult, LinkType
domain/            <- Domain, ComponentCounts
cross-domain/      <- CrossDomainLink, DomainConnection
stats/             <- GraphStats
external/          <- ExternalDomain
```

Update imports across all query files.

### Phase 3: Rename and Relocate (Low Risk)

- `RiviereQuery.ts` -> `riviere-query.ts` (file naming consistency)
- `riviere-graph-fixtures.ts` -> `test/fixtures/` (test infrastructure separation)
- `parse*` functions -> static factory pattern (semantic clarity)

### Phase 4: Add Query Subdirectories (Optional)

Group query files with their types:
```text
flow/
  flow-queries.ts
  flow-types.ts
  entry-point-types.ts
```

This improves discoverability but increases import path depth. Evaluate based on team preference.

## Public API

The facade class (`RiviereQuery`) remains the primary public interface. Internal module restructuring does not change the public API:

```typescript
import {
  RiviereQuery,
  ComponentId,
  Flow,
  Entity,
  GraphDiff
} from '@living-architecture/riviere-query'
```

All types re-exported through `index.ts`. Consumers unaffected by internal restructuring.

## Verification Checklist

### Separation of Concerns

- [x] No features/platform/shell (appropriate for library)
- [x] Shared branded types in dedicated module
- [x] Query-specific types co-located with query modules
- [x] No external services
- [x] Functions grouped by state dependency
- [x] Related names grouped together
- [x] No generic type-grouping files spanning concepts
- [x] Test fixtures outside production source

### Tactical DDD

- [x] Domain isolated from infrastructure
- [x] Names from domain vocabulary
- [x] Entity class has behavior
- [x] Hidden concepts made explicit (entry point types)
- [x] Value objects via branded types
- [x] Query projections appropriately anemic

## Trade-offs

1. **Branded primitives vs full value objects**: Chose primitives for performance in query-heavy library. Trade-off: no behavior on value types.

2. **Flat vs nested structure**: Chose nested folders for discoverability. Trade-off: deeper import paths internally.

3. **Type co-location vs shared types file**: Chose co-location. Trade-off: consumers import from specific modules, not single types file.

4. **Static factory vs class constructor for branded types**: Chose static factory (`ComponentId.from()`). Trade-off: slightly more verbose than `new ComponentId()`.
