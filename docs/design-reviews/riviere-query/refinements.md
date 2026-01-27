# Refinements: riviere-query

This document captures the refinements applied to the original design review using separation-of-concerns and tactical-ddd principles.

## Separation of Concerns Refinements

### Structure Assessment

The original design correctly identified that the full `features/platform/shell` structure is overkill for a query-only library with no I/O. However, the analysis can be sharper about what structure IS appropriate.

**Refinement 1: Clarify Appropriate Structure for Query Libraries**

A query-only library is not an application. It has no entrypoints (HTTP controllers, CLI handlers), no use cases (user goals), and no orchestration of multiple aggregates. The entire package IS domain logic.

The appropriate structure for this package:
- `src/` - All query domain logic
- `src/__fixtures__/` or separate `test/fixtures/` - Test infrastructure

No `features/platform/shell` needed. The package exports domain query capabilities consumed by other applications.

### Principle Application

**Principle 4: Separate functions that depend on different state**

The original design identified violations in `domain-types.ts` and `event-types.ts`. The refinement adds specificity:

| File | State Dependencies | Recommended Split |
|------|-------------------|-------------------|
| `domain-types.ts` (365 lines) | Zod schemas, validation interfaces, domain interfaces, diff interfaces, flow interfaces, stats interfaces | See refined.md for cohesive groupings |
| `event-types.ts` (125 lines) | Entity class (DomainOp[], state transitions), Event interfaces (pub/sub) | `entity.ts` + `event-types.ts` |

**Principle 5: Separate functions that don't have related names**

The `domain-types.ts` file contains:
- `parseComponentId`, `parseLinkId`, `parseEntityName`... - Branded type parsing
- `ValidationError`, `ValidationResult` - Validation results
- `Domain`, `ComponentCounts` - Domain analysis
- `FlowStep`, `Flow` - Flow tracing
- `GraphDiff`, `DiffStats` - Version comparison
- `CrossDomainLink`, `DomainConnection` - Cross-domain analysis
- `GraphStats`, `ExternalDomain` - Statistics

These names cluster into distinct concepts. Each cluster should be its own module.

### Checklist Application

| # | Check | Status | Refinement |
|---|-------|--------|------------|
| 1 | features/platform/shell exist | N/A | Not applicable to library packages |
| 2 | platform/ contains only domain/ and infra/ | N/A | Not applicable |
| 3 | each feature contains only entrypoint/use-cases/domain/ | N/A | Not applicable |
| 4 | shell/ contains no business logic | N/A | Not applicable |
| 5 | code belonging to one feature in features/[feature]/ | N/A | Library has no features |
| 6 | shared business logic in platform/domain/ | N/A | Entire library is query domain |
| 7 | external service wrappers in platform/infra/ | PASS | No external services |
| 8 | custom folders inside domain/ | N/A | No custom folders |
| 9 | functions rely on same state | FAIL | domain-types.ts, event-types.ts |
| 10 | file names relate to others in directory | MIXED | PascalCase inconsistency |
| 11 | directory name describes contents | PASS | Single src/ directory |
| 12 | use-cases/ contains only use-case files | N/A | No use-cases |
| 13 | no generic type-grouping files | FAIL | domain-types.ts spans concepts |
| 14 | entrypoint/ is thin | N/A | No entrypoints |

## Tactical DDD Refinements

### Principle 1: Isolate domain logic

**Status: PASS**

The package is pure query domain logic with no infrastructure. All functions operate on `RiviereGraph` data structures with no database, HTTP, or logging dependencies. This is exemplary domain isolation.

### Principle 2: Use rich domain language

**Status: MIXED**

**PASS Examples:**
- `Entity`, `EntityTransition`, `PublishedEvent` - Domain expert recognizable
- `traceFlowFrom`, `findEntryPoints`, `queryCrossDomainLinks` - Describes what the operation does

**FAIL Examples:**
- `domain-types.ts` - Generic filename. What domain? Which types?
- `parseComponentId`, `parseLinkId` - These are branded type factories, not parsers. They don't parse strings into complex structures; they brand strings with type information.

**Refinement:** Rename `parse*` functions to `brand*` or use static factory methods on value object types.

### Principle 3: Orchestrate with use cases

**Status: N/A**

This is a library, not an application. There are no user goals to orchestrate. The `RiviereQuery` facade exposes query capabilities but is not a use case itself.

**Note:** `searchWithFlowContext` orchestrates `searchComponents` and `traceFlowFrom`. This is appropriate composition within domain logic, not use-case-level orchestration.

### Principle 4: Avoid anemic domain model

**Status: MIXED**

**PASS:**
The `Entity` class is a proper domain object with behavior:
```typescript
class Entity {
  hasStates(): boolean { return this.states.length > 0 }
  hasBusinessRules(): boolean { return this.businessRules.length > 0 }
  firstOperationId(): string | undefined { return this.operations[0]?.id }
}
```

**FAIL:**
Most query result types are pure data interfaces with no behavior:
- `Domain`, `FlowStep`, `Flow`, `PublishedEvent`, `EventHandlerInfo`

These are query result DTOs, not domain entities. DTOs are appropriate for query results. However, some could benefit from derived properties:

```typescript
// Current: consumer calculates
const hasEvents = domain.componentCounts.Event > 0

// Better: domain expresses
interface Domain {
  hasEvents(): boolean
}
```

**Refinement:** Evaluate which query result types would benefit from behavioral methods vs. remaining pure DTOs. For a read-only query library, pure DTOs are often appropriate.

### Principle 5: Separate generic concepts

**Status: PASS**

The package has no generic utilities mixed with domain logic. Zod is used only for branded type creation, which is domain-specific (ComponentId, LinkId are domain concepts).

### Principle 6: Make the implicit explicit

**Status: NEEDS IMPROVEMENT**

**Implicit concept 1: Branded Types**

Current implementation uses Zod schemas internally but the domain concept is "branded types for type safety". The implementation detail (Zod) is exposed in the type inference:
```typescript
export type ComponentId = z.infer<typeof componentIdSchema>
```

**Refinement:** Consider explicit branded type pattern:
```typescript
export type ComponentId = string & { readonly __brand: 'ComponentId' }
```

**Implicit concept 2: Flow Direction**

`traceFlowFrom` traces bidirectionally but the name suggests forward-only. The domain concept of "flow context" (all connected components) is implicit.

**Refinement:** Consider `findConnectedComponents` or explicit `FlowContext` type that names both directions.

**Implicit concept 3: Entry Point Definition**

Entry points are defined as "UI, API, EventHandler, or Custom with no incoming links". This business rule is embedded in `findEntryPoints`:
```typescript
const entryPointTypes = new Set<ComponentType>(['UI', 'API', 'EventHandler', 'Custom'])
return graph.components.filter((c) => entryPointTypes.has(c.type) && !targets.has(c.id))
```

**Refinement:** Extract to named constant or type:
```typescript
const ENTRY_POINT_TYPES: ReadonlySet<ComponentType> = new Set(['UI', 'API', 'EventHandler', 'Custom'])
```

### Principle 7: Design aggregates around invariants

**Status: N/A**

This is a read-only query library. There are no aggregates to protect invariants. The source of truth is the `RiviereGraph` JSON which comes from external systems.

The `Entity` class aggregates operations, states, transitions, and business rules but this is for query convenience, not invariant protection.

### Principle 8: Extract immutable value objects liberally

**Status: NEEDS IMPROVEMENT**

**Current value objects (via branded types):**
- `ComponentId`, `LinkId`, `EntityName`, `DomainName`, `State`, `OperationName`
- `EventId`, `EventName`, `HandlerId`, `HandlerName`

These are good candidates for value objects but are implemented as branded primitives. They lack:
- Equality semantics (relying on primitive `===`)
- Validation logic (any string is accepted)
- Domain behavior

**Potential value objects not extracted:**
- `LinkType` is just `'sync' | 'async'` - could be a value object with `isAsynchronous()` behavior
- Depth in `FlowStep` is a number - could be `FlowDepth` with `isEntryPoint()`, `isDeep()` behavior

**Refinement:** For a query library, branded primitives are acceptable. Full value object classes add overhead for read-only data. Keep current approach but document the tradeoff.

## DDD Checklist Application

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Domain isolated from infrastructure | PASS | Pure query logic, no I/O |
| 2 | Names from domain, not jargon | MIXED | Some generic names (domain-types.ts) |
| 3 | Use cases are user intentions | N/A | Library, not application |
| 4 | Logic in domain objects, use cases orchestrate | MIXED | Entity has behavior; DTOs are anemic (appropriate for queries) |
| 5 | States modeled as distinct types | PARTIAL | `KnownSourceEvent \| UnknownSourceEvent` is good; Entity states could be richer |
| 6 | Hidden concepts extracted and named | NEEDS WORK | Entry point definition, flow direction implicit |
| 7 | Aggregates around invariants | N/A | Read-only library |
| 8 | Values extracted to value objects | PARTIAL | Branded types exist but lack behavior |

## Summary of Refinements

### High Priority

1. **Split domain-types.ts** into cohesive modules grouped by concept
2. **Extract Entity class** from event-types.ts to its own module
3. **Move test fixtures** out of production source
4. **Rename parse* functions** to reflect they are branding operations, not parsing

### Medium Priority

5. **Make entry point types explicit** as a named constant
6. **Clarify flow tracing semantics** in function naming
7. **Consider behavior methods** on key query result types

### Low Priority

8. **Naming consistency** (PascalCase vs kebab-case for files)
9. **Light folder structure** for discoverability (queries/ subdirectory)

### Deferred/Rejected

- Full features/platform/shell structure: Overkill for library
- Full value object classes: Overhead for read-only query data
- Aggregate design: Not applicable to read-only queries
