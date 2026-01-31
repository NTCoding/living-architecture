# Separation of Concerns Analysis: riviere-builder

## Package Overview

**Package:** `@living-architecture/riviere-builder`
**Location:** `/Users/nicko/code/living-architecture-issue-203-architecture-review-and-adr-fo/packages/riviere-builder/`
**Purpose:** Construct Riviere architecture graphs programmatically via a fluent builder API

## Current Structure

```text
packages/riviere-builder/
└── src/
    ├── index.ts                    # Public exports
    ├── builder.ts                  # RiviereBuilder class (main API)
    ├── builder-assertions.ts       # Domain existence checks
    ├── builder-internals.ts        # ID generation, validation wrappers
    ├── builder-test-fixtures.ts    # Test helpers
    ├── component-suggestion.ts     # Fuzzy matching for error messages
    ├── deduplicate.ts              # Array deduplication utilities
    ├── errors.ts                   # All error classes
    ├── inspection.ts               # Graph analysis functions
    ├── merge-behavior.ts           # Behavior merge logic
    ├── string-similarity.ts        # Levenshtein distance algorithm
    └── types.ts                    # All input/output type definitions
```

## Checklist Evaluation

### 1. Verify features/, platform/, shell/ exist at root

**Status:** FAIL

The package uses a flat `src/` structure. No `features/`, `platform/`, or `shell/` directories exist.

### 2. Verify platform/ contains only domain/ and infra/

**Status:** N/A (no platform/ directory exists)

### 3. Verify each feature contains only entrypoint/, use-cases/, domain/

**Status:** N/A (no features/ directory exists)

### 4. Verify shell/ contains no business logic

**Status:** N/A (no shell/ directory exists)

### 5. Verify code belonging to one feature is in features/[feature]/

**Status:** FAIL

All code is in a flat structure. The package has identifiable features that are not separated:
- **Graph Building:** Component addition, linking, serialization
- **Graph Inspection:** Validation, statistics, orphan detection, warnings
- **Error Recovery:** Near-match suggestions, fuzzy string matching

### 6. Verify shared business logic is in platform/domain/

**Status:** FAIL

Shared logic (deduplication, string similarity) is scattered in root `src/`.

### 7. Verify external service wrappers are in platform/infra/

**Status:** N/A

This package has no external service dependencies. It uses only Node.js `fs` for file I/O in the `save()` method of `builder.ts`.

### 8. Verify custom folders are inside domain/, not use-cases/

**Status:** N/A (no use-cases/ directory exists)

### 9. Verify each function relies on same state as others in its class/file

**Status:** PARTIAL PASS

- `builder.ts`: The `RiviereBuilder` class methods all operate on `this.graph` (same state)
- `errors.ts`: All error classes are stateless value objects (cohesive)
- `types.ts`: All type definitions (no functions, cohesive)
- `inspection.ts`: Functions operate on `InspectionGraph` parameter (cohesive)
- `component-suggestion.ts`: Functions operate on component arrays (cohesive)
- `string-similarity.ts`: Pure functions on string parameters (cohesive)

However:
- `builder-internals.ts`: Mixes ID generation with validation delegation (different concerns)

### 10. Verify each file name relates to other files in its directory

**Status:** PARTIAL FAIL

All files are in root `src/`, making naming relationships unclear. Some names relate:
- `builder.ts`, `builder-internals.ts`, `builder-assertions.ts` (builder family)
- `component-suggestion.ts`, `string-similarity.ts` (suggestion family)

But others are loosely related:
- `deduplicate.ts` (utility)
- `merge-behavior.ts` (specific to DomainOp enrichment)
- `inspection.ts` (graph analysis)

### 11. Verify each directory name describes what all files inside have in common

**Status:** FAIL

Only one directory (`src/`) contains all code. The name does not describe the commonality.

### 12. Verify use-cases/ contains only use-case files

**Status:** N/A (no use-cases/ directory exists)

### 13. Verify no generic type-grouping files spanning multiple capabilities

**Status:** FAIL

- `types.ts`: Contains 15+ interfaces spanning building, linking, enrichment, matching, warnings
- `errors.ts`: Contains 12 error classes spanning domains, components, validation, custom types

### 14. Verify entrypoint/ is thin and never imports from domain/

**Status:** N/A (no entrypoint/ directory exists)

## Analysis Summary

### Identified Features (Capabilities)

1. **graph-construction**: Building graphs with components and links
   - `builder.ts` (RiviereBuilder class)
   - `builder-internals.ts` (ID generation)
   - `builder-assertions.ts` (validation)

2. **graph-enrichment**: Enriching DomainOp components
   - `merge-behavior.ts`
   - `deduplicate.ts` (shared utility)

3. **graph-inspection**: Analyzing graph state
   - `inspection.ts` (stats, orphans, warnings, validation)

4. **error-recovery**: Suggesting alternatives on errors
   - `component-suggestion.ts`
   - `string-similarity.ts`

### Platform Candidates (Shared Logic)

- `string-similarity.ts`: Generic Levenshtein distance algorithm
- `deduplicate.ts`: Generic array deduplication

### Principle Violations

#### Principle 2: Separate feature-specific from shared capabilities

`string-similarity.ts` is a generic algorithm useful beyond this package. It belongs in `platform/domain/` as shared logic.

`deduplicate.ts` contains generic deduplication logic. The string deduplication is generic; the state transition deduplication is domain-specific to Riviere graphs.

#### Principle 3: Separate intent from execution

`builder.ts` mixes high-level flow with some implementation details:
- Component creation methods follow a consistent pattern (good)
- The `enrichComponent` method has implementation details interleaved with intent

#### Principle 5: Separate functions that don't have related names

`builder-internals.ts` contains:
- `generateComponentId()` - ID generation
- `createComponentNotFoundError()` - Error creation
- `validateDomainExists()`, `validateCustomType()`, `validateRequiredProperties()` - Validation wrappers

These functions have unrelated names and purposes, grouped only by being "internal" to the builder.

## Recommended Structure

```text
packages/riviere-builder/
└── src/
    ├── features/
    │   ├── graph-construction/
    │   │   ├── entrypoint/
    │   │   │   └── riviere-builder.ts      # Public builder class
    │   │   ├── use-cases/
    │   │   │   ├── add-component.ts        # Component addition logic
    │   │   │   ├── create-link.ts          # Linking logic
    │   │   │   └── build-graph.ts          # Final build/validation
    │   │   └── domain/
    │   │       ├── component-id.ts         # ID generation
    │   │       ├── graph-state.ts          # BuilderGraph type
    │   │       └── validation.ts           # Domain/type assertions
    │   │
    │   ├── graph-enrichment/
    │   │   ├── entrypoint/
    │   │   │   └── enrichment-api.ts       # Public enrichment methods
    │   │   ├── use-cases/
    │   │   │   └── enrich-domain-op.ts     # Enrichment orchestration
    │   │   └── domain/
    │   │       ├── merge-behavior.ts       # Behavior merging rules
    │   │       └── state-transition.ts     # State transition dedup
    │   │
    │   ├── graph-inspection/
    │   │   ├── entrypoint/
    │   │   │   └── inspection-api.ts       # Public inspection methods
    │   │   └── domain/
    │   │       ├── find-orphans.ts         # Orphan detection
    │   │       ├── calculate-stats.ts      # Statistics
    │   │       ├── find-warnings.ts        # Warning detection
    │   │       └── graph-validation.ts     # Schema validation
    │   │
    │   └── error-recovery/
    │       ├── entrypoint/
    │       │   └── suggestion-api.ts       # Public suggestion methods
    │       └── domain/
    │           ├── near-match.ts           # Fuzzy component matching
    │           └── mismatch-detection.ts   # Type/domain mismatch
    │
    ├── platform/
    │   └── domain/
    │       ├── string-similarity/
    │       │   └── levenshtein.ts          # Generic string similarity
    │       └── array-deduplication/
    │           └── deduplicate-strings.ts  # Generic deduplication
    │
    └── shell/
        └── index.ts                        # Public API exports
```

## Key Findings

| Finding | Severity | Location |
|---------|----------|----------|
| Flat structure missing features/platform/shell | High | `/packages/riviere-builder/src/` |
| Generic types.ts spans multiple capabilities | Medium | `/packages/riviere-builder/src/types.ts` |
| Generic errors.ts spans multiple capabilities | Medium | `/packages/riviere-builder/src/errors.ts` |
| builder-internals.ts mixes unrelated functions | Medium | `/packages/riviere-builder/src/builder-internals.ts` |
| Generic algorithms not in platform/ | Low | `string-similarity.ts`, `deduplicate.ts` |

## Recommendations

1. **Introduce feature directories** to separate graph-construction, graph-enrichment, graph-inspection, and error-recovery capabilities

2. **Split types.ts** into feature-specific types co-located with their features:
   - `graph-construction/domain/input-types.ts`
   - `graph-inspection/domain/stats-types.ts`
   - `error-recovery/domain/match-types.ts`

3. **Split errors.ts** into feature-specific errors:
   - `graph-construction/domain/construction-errors.ts`
   - `graph-enrichment/domain/enrichment-errors.ts`

4. **Extract platform/domain/** for truly generic utilities:
   - `string-similarity/` - Levenshtein algorithm
   - `array-deduplication/` - Generic dedup

5. **Decompose builder-internals.ts** by responsibility:
   - ID generation into `graph-construction/domain/`
   - Validation wrappers into `graph-construction/domain/`

6. **Create shell/index.ts** as the single public API surface that composes and exports the features

## Trade-offs

**Current structure benefits:**
- Simple navigation (few files)
- Easy to understand for small codebase
- Matches existing project conventions in `docs/conventions/codebase-structure.md`

**Recommended structure benefits:**
- Clear separation of concerns
- Easier to test features in isolation
- Easier to evolve features independently
- Types/errors co-located with usage

**Migration risk:**
- Breaking changes to imports
- Increased file count
- More complex navigation initially

## Conclusion

The `riviere-builder` package violates several separation of concerns principles due to its flat structure. The most significant issues are:
1. No feature-based organization
2. Generic types and errors spanning multiple capabilities
3. Mixed responsibilities in `builder-internals.ts`

For a package of this size (~10 source files), the current structure is maintainable but will not scale well. If the package grows or requires significant modification, restructuring according to the recommended layout would improve maintainability and testability.
