# Refined Design: riviere-builder

## Package Overview

**Package:** `@living-architecture/riviere-builder`
**Location:** `/Users/nicko/code/living-architecture-issue-203-architecture-review-and-adr-fo/packages/riviere-builder/`
**Purpose:** Construct Riviere architecture graphs programmatically via a fluent builder API

---

## Refined Structure

```text
packages/riviere-builder/
└── src/
    ├── index.ts                              # Public API exports (shell for libraries)
    │
    ├── features/
    │   ├── graph-construction/
    │   │   ├── domain/
    │   │   │   ├── component-id-generator.ts # ID generation using ComponentId value object
    │   │   │   ├── graph-under-construction.ts # BuilderGraph type and invariants
    │   │   │   ├── domain-assertions.ts      # Domain/custom-type existence checks
    │   │   │   └── construction-errors.ts    # DuplicateDomainError, DomainNotFoundError, etc.
    │   │   └── use-cases/
    │   │       └── riviere-builder.ts        # RiviereBuilder class (fluent API)
    │   │
    │   ├── graph-enrichment/
    │   │   └── domain/
    │   │       ├── behavior-merger.ts        # mergeBehavior logic
    │   │       ├── state-transition-dedup.ts # Domain-specific deduplication
    │   │       └── enrichment-errors.ts      # InvalidEnrichmentTargetError
    │   │
    │   ├── graph-inspection/
    │   │   └── domain/
    │   │       ├── orphan-detector.ts        # findOrphans
    │   │       ├── stats-calculator.ts       # calculateStats
    │   │       ├── warning-detector.ts       # findWarnings
    │   │       ├── graph-validator.ts        # validateGraph
    │   │       ├── graph-converter.ts        # toRiviereGraph
    │   │       ├── inspection-types.ts       # BuilderStats, BuilderWarning, WarningCode
    │   │       └── validation-errors.ts      # BuildValidationError, InvalidGraphError
    │   │
    │   └── error-recovery/
    │       └── domain/
    │           ├── near-match-finder.ts      # findNearMatches
    │           ├── mismatch-detector.ts      # detectMismatch
    │           ├── suggestion-generator.ts   # createSourceNotFoundError
    │           ├── match-types.ts            # NearMatchQuery, NearMatchResult, etc.
    │           └── lookup-errors.ts          # ComponentNotFoundError
    │
    └── platform/
        └── domain/
            ├── text-similarity/
            │   └── levenshtein.ts            # levenshteinDistance, similarityScore
            └── collection-utils/
                └── deduplicate-strings.ts    # deduplicateStrings (generic)
```

---

## Separation of Concerns Checklist (Refined)

### 1. Verify features/, platform/, shell/ exist at root

**Status:** PASS (adapted for library pattern)

- `features/` contains feature-specific code
- `platform/` contains shared generic utilities
- `index.ts` serves as public API surface (library equivalent of shell)

### 2. Verify platform/ contains only domain/ and infra/

**Status:** PASS

- `platform/domain/` contains generic algorithms
- No `infra/` needed - this package has no external service dependencies (filesystem I/O removed per DDD-1)

### 3. Verify each feature contains only entrypoint/, use-cases/, domain/

**Status:** PASS (adapted)

- `graph-construction/` has `use-cases/` (RiviereBuilder) and `domain/`
- Other features have only `domain/` (no separate use-cases needed - they are called directly by the builder)

### 4. Verify shell/ contains no business logic

**Status:** PASS

- `index.ts` contains only re-exports

### 5. Verify code belonging to one feature is in features/[feature]/

**Status:** PASS

Four features clearly separated:
- `graph-construction/` - building graphs with components and links
- `graph-enrichment/` - enriching DomainOp components
- `graph-inspection/` - analyzing graph state
- `error-recovery/` - suggesting alternatives on errors

### 6. Verify shared business logic is in platform/domain/

**Status:** PASS

- `text-similarity/` - Levenshtein algorithm (generic)
- `collection-utils/` - string deduplication (generic)

### 7. Verify external service wrappers are in platform/infra/

**Status:** N/A

- Filesystem I/O removed from builder (callers handle I/O)
- No external service dependencies

### 8. Verify custom folders are inside domain/, not use-cases/

**Status:** PASS

- No custom folders outside defined structure

### 9. Verify each function relies on same state as others in its class/file

**Status:** PASS

Each file now contains cohesive functions:
- `behavior-merger.ts` - merging behavior objects
- `orphan-detector.ts` - finding orphans
- `near-match-finder.ts` - fuzzy matching

### 10. Verify each file name relates to other files in its directory

**Status:** PASS

Files grouped by feature. Names within each feature relate:
- `graph-inspection/domain/`: orphan-detector, stats-calculator, warning-detector, graph-validator
- `error-recovery/domain/`: near-match-finder, mismatch-detector, suggestion-generator

### 11. Verify each directory name describes what all files inside have in common

**Status:** PASS

- `graph-construction/` - files for constructing graphs
- `graph-enrichment/` - files for enriching components
- `graph-inspection/` - files for inspecting/analyzing graphs
- `error-recovery/` - files for error recovery and suggestions

### 12. Verify use-cases/ contains only use-case files

**Status:** PASS

- `graph-construction/use-cases/` contains only `riviere-builder.ts`

### 13. Verify no generic type-grouping files spanning multiple capabilities

**Status:** PASS

Types co-located with features:
- `inspection-types.ts` in `graph-inspection/domain/`
- `match-types.ts` in `error-recovery/domain/`

### 14. Verify entrypoint/ is thin and never imports from domain/

**Status:** N/A (library pattern)

- No entrypoint/ directories
- `RiviereBuilder` class is in `use-cases/` and properly orchestrates domain operations

---

## Tactical DDD Checklist (Refined)

### 1. Verify domain is isolated from infrastructure

**Status:** PASS (after refinement)

**Change:** Remove `save()` method from `RiviereBuilder`. Callers use:
```typescript
const graph = builder.build()
await fs.writeFile(path, JSON.stringify(graph, null, 2))
```

This removes Node.js `fs` dependency and makes the package browser-compatible.

### 2. Verify names are from YOUR domain, not generic developer jargon

**Status:** PASS

Domain terms used consistently:
- Component, Domain, Link, Graph (from Riviere domain)
- Enrichment (domain concept for adding details)
- NearMatch (domain concept for error recovery)
- DomainOp, UseCase, Event, EventHandler (component types)

### 3. Verify use cases are intentions of users (menu test)

**Status:** PASS

User intentions (what would appear in a menu):
- Create new graph configuration
- Add component to graph
- Link components together
- Enrich component with details
- Find similar components (for error recovery)
- Inspect graph (stats, warnings, orphans)
- Validate graph
- Build final graph

All these are represented as methods on `RiviereBuilder`.

### 4. Verify business logic lives in domain objects, use cases only orchestrate

**Status:** PASS

Business logic properly placed:
- `mergeBehavior()` - knows how to merge operation behaviors
- `deduplicateStateTransitions()` - knows equality rules for transitions
- `findNearMatches()` - knows fuzzy matching domain logic
- `findOrphans()` - knows what orphan means
- Domain assertions - know validation rules

`RiviereBuilder` orchestrates these domain operations.

### 5. Verify states are modeled as distinct types where appropriate

**Status:** PASS

Graph states distinguished:
- `BuilderGraph` (internal) - mutable, under construction
- `RiviereGraph` (output) - validated, final

Component types modeled distinctly in schema package.

### 6. Verify hidden domain concepts are extracted and named explicitly

**Status:** PASS (after refinements)

Explicit concepts:
- `ComponentId` value object (from schema) used for identity
- `NearMatchResult` explicitly models fuzzy match with score and mismatch info
- `BuilderWarning` explicitly models non-fatal issues with code

### 7. Verify aggregates are designed around invariants

**Status:** PASS

`RiviereBuilder` is the aggregate root for graph construction:
- Invariant: No duplicate component IDs - enforced by `registerComponent()`
- Invariant: All components reference valid domains - enforced by `validateDomainExists()`
- Invariant: All links reference valid sources - enforced by `link()` and `linkExternal()`
- External code cannot directly mutate internal state

### 8. Verify values are extracted into value objects

**Status:** PARTIAL PASS

Value objects in use:
- `ComponentId` (from schema) - used in error recovery
- `SourceLocation` (from schema) - location information

Potential value objects not yet extracted:
- Domain name (currently primitive string)
- Module name (currently primitive string)

These could be value objects but primitives are acceptable for simple identifiers without behavior.

---

## Key Changes from Original Design

| Change | Rationale | Impact |
|--------|-----------|--------|
| Remove `save()` method | Domain isolation, browser compatibility | Breaking change for callers using `save()` |
| Introduce feature directories | Separation of concerns | Internal reorganization |
| Split types.ts | Cohesion, co-location | Import paths change |
| Split errors.ts | Cohesion, co-location | Import paths change |
| Extract generic algorithms to platform/ | Separation of feature-specific from shared | Internal reorganization |
| Use ComponentId internally | Value object pattern, explicit domain concept | Internal improvement |

---

## Trade-offs

### Benefits of Refined Design

1. **Clear feature boundaries** - Easy to understand what each feature does
2. **Cohesive modules** - Types and errors co-located with usage
3. **Testable in isolation** - Features can be tested independently
4. **Browser compatible** - Removing filesystem dependency enables browser usage
5. **Domain isolation** - No infrastructure concerns in domain code

### Costs of Refined Design

1. **More files** - ~20 files vs current ~12
2. **Deeper nesting** - `features/graph-construction/domain/` vs flat `src/`
3. **Migration effort** - All imports need updating
4. **Import verbosity** - Longer import paths internally

### Recommendation

For a package of this size (~600 lines of production code), the refined structure provides meaningful benefits for maintainability and testability. The increased file count is offset by:
- Each file having single responsibility
- Types co-located with usage (no hunting through types.ts)
- Errors co-located with throwing code
- Clear boundaries for future growth

The `save()` removal is the most impactful change, as it affects the public API. This should be considered carefully against the browser-compatibility benefit.

---

## Dependency Flow

```text
index.ts (public API)
    │
    └── features/graph-construction/use-cases/riviere-builder.ts
            │
            ├── features/graph-construction/domain/*
            ├── features/graph-enrichment/domain/*
            ├── features/graph-inspection/domain/*
            ├── features/error-recovery/domain/*
            │
            └── platform/domain/*
```

Rules:
- `use-cases/` depends on `domain/` (same feature or platform)
- `domain/` never depends on `use-cases/`
- Features do not depend on each other's `domain/` directly
- All cross-feature coordination goes through `RiviereBuilder` (the orchestrator)
