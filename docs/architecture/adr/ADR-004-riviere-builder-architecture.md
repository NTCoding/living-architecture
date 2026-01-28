# ADR-004: riviere-builder Architecture

**Status:** Accepted
**Date:** 2026-01-27
**Deciders:** @ntcoding

## Context

`riviere-builder` is a library for constructing Riviere architecture graphs programmatically. The current implementation has:
- 877-line `RiviereBuilder` class (violates 400-line limit)
- Public `graph` field exposing internal state
- `save()` method with Node.js `fs` imports (prevents browser use)
- Monolithic `types.ts` (18 interfaces) and `errors.ts` (12 classes) spanning multiple concerns
- Direct mutation in `enrichComponent()` method
- Minimal validation in `resume()` method

## Decision

### 1. Libraries Are Pure Domain

Unlike applications (CLI, web apps), libraries have no entrypoint or use-cases layer. A library IS the domain.

**Structure for libraries:**
```text
src/
├── domain/           # All domain logic, split by concept
├── platform/         # Shared utilities (if any)
└── index.ts          # Public API exports
```

### 2. Remove save() and Node.js Dependencies

The `save()` method violates domain isolation by embedding filesystem I/O. Remove it entirely.

**Before:**
```typescript
await builder.save('./graph.json')  // Library does I/O
```

**After:**
```typescript
const graph = builder.build()
await fs.writeFile(path, JSON.stringify(graph, null, 2))  // Caller handles I/O
```

The library provides:
- `build()` - validates and returns `RiviereGraph`
- `serialize()` - returns JSON string for drafts

Persistence is the caller's responsibility. Also remove `DirectoryNotFoundError` (only existed for `save()`).

### 3. Builder as Facade with Delegates

`RiviereBuilder` stays as the public API but delegates to internal classes:

```typescript
export class RiviereBuilder {
  private construction: GraphConstruction
  private linking: GraphLinking
  private enrichment: GraphEnrichment
  private inspection: GraphInspection

  addDomain(...) { return this.construction.addDomain(...) }
  addComponent(...) { return this.construction.addComponent(...) }
  link(...) { return this.linking.link(...) }
  enrichComponent(...) { return this.enrichment.enrich(...) }
  stats() { return this.inspection.stats() }
  warnings() { return this.inspection.warnings() }
}
```

Each delegate class stays under 400 lines. Domain logic is testable in isolation.

### 4. Make graph Field Private

The `graph: BuilderGraph` field must be private to protect aggregate invariants. External code cannot bypass validation by directly mutating `builder.graph.components`.

### 5. Use Immutable Patterns for Enrichment

`enrichComponent()` should create a new component object with all changes applied atomically, then replace in the array. No direct mutation.

```typescript
// Before: direct mutation (partial failure leaves inconsistent state)
component.entity = enrichment.entity
component.stateChanges = [...]

// After: atomic replacement
const enrichedComponent = { ...component, ...appliedEnrichment }
this.replaceComponent(component.id, enrichedComponent)
```

### 6. Validate on resume()

`RiviereBuilder.resume()` must validate the input graph before restoring state. Malformed graphs should fail fast, not corrupt builder state.

### 7. Use ComponentId Value Object Internally

`generateComponentId()` should return `ComponentId` value object, not string. Callers needing strings call `.toString()`. Format defined in one place.

### 8. Split types.ts and errors.ts by Domain Concept

Co-locate types and errors with their domain concepts:

```text
domain/
├── construction/
│   ├── graph-construction.ts
│   ├── construction-types.ts      # Component inputs, builder options
│   └── construction-errors.ts     # DuplicateDomainError, etc.
├── enrichment/
│   ├── graph-enrichment.ts
│   └── enrichment-errors.ts       # InvalidEnrichmentTargetError
├── inspection/
│   ├── graph-inspection.ts
│   └── inspection-types.ts        # Stats, warnings
└── error-recovery/
    ├── near-match.ts
    └── match-types.ts             # NearMatchQuery, NearMatchResult
```

### 9. Extract Generic Utilities to platform/

Generic algorithms move to `platform/`:
- `platform/text-similarity/levenshtein.ts` - string similarity algorithm
- `platform/collection-utils/deduplicate-strings.ts` - generic deduplication

Domain-specific `deduplicateStateTransitions()` stays with enrichment.

## Consequences

### Positive

- Library is browser-compatible (no Node.js dependencies)
- Builder class stays under 400 lines
- Aggregate invariants protected (private state)
- Immutable patterns prevent partial-failure inconsistencies
- Types/errors co-located with usage
- Generic utilities reusable

### Negative

- More files (delegates, split types/errors)
- Callers must handle persistence themselves
- Migration effort

### Mitigations

- Delegate classes are small and focused
- Persistence is trivial (2 lines for caller)
- Migration can be incremental

## Alternatives Considered

### Keep save() with Injected Writer

```typescript
interface GraphWriter { write(path: string, content: string): Promise<void> }
await builder.save(path, writer)
```

**Why rejected:** Adds ceremony without value. Caller can just do `fs.writeFile(path, JSON.stringify(builder.build()))`. Keep the library pure.

### Keep Single RiviereBuilder Class

**Why rejected:** 877 lines violates 400-line limit. God class with too many responsibilities. Facade + delegates gives same API with better internals.

### Keep Public graph Field

**Why rejected:** Allows bypassing invariant protection. Aggregate pattern requires private state.
