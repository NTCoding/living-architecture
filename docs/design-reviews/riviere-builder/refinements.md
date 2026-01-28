# Refinements: riviere-builder

This document catalogs refinements to the original design based on the `separation-of-concerns` and `tactical-ddd` skills.

---

## Separation of Concerns Refinements

### SOC-1: Feature Directory Structure

**Original:** Flat `src/` structure with all files at root level.

**Refinement:** Introduce `features/`, `platform/`, and `shell/` directories. However, for this package, the structure requires adjustment:

- This package is a **library**, not an application
- There are no external entrypoints (HTTP, CLI) - the `RiviereBuilder` class IS the API
- The `shell/` directory concept applies to wiring for applications, not libraries

**Refined structure:** For libraries, the three-folder pattern adapts:
- `features/` contains feature-specific domain logic
- `platform/` contains shared capabilities
- The public API surface (`index.ts`) serves as the "shell" for libraries

### SOC-2: Generic Utilities Extraction

**Original:** `string-similarity.ts` and `deduplicateStrings()` in `deduplicate.ts` are in the feature code.

**Refinement:** Extract generic algorithms to `platform/domain/`:
- `platform/domain/text-similarity/levenshtein.ts` - pure algorithm
- `platform/domain/collection-utils/deduplicate-strings.ts` - generic dedup

The domain-specific `deduplicateStateTransitions()` stays with enrichment feature.

### SOC-3: Split Types Spanning Multiple Capabilities

**Original:** `types.ts` contains 18 interfaces spanning construction, enrichment, inspection, and near-matching.

**Refinement:** Co-locate types with their features:
- `features/graph-construction/domain/input-types.ts` - component inputs
- `features/graph-enrichment/domain/enrichment-types.ts` - enrichment input
- `features/graph-inspection/domain/stats-types.ts` - stats and warnings
- `features/error-recovery/domain/match-types.ts` - near-match query/result

### SOC-4: Split Errors Spanning Multiple Capabilities

**Original:** `errors.ts` contains 12 error classes for domains, components, validation, custom types, and I/O.

**Refinement:** Co-locate errors with their features:
- Construction errors: `DuplicateDomainError`, `DomainNotFoundError`, `DuplicateComponentError`, `CustomTypeNotFoundError`, `CustomTypeAlreadyDefinedError`, `MissingRequiredPropertiesError`, `MissingSourcesError`, `MissingDomainsError`
- Component lookup errors: `ComponentNotFoundError`
- Enrichment errors: `InvalidEnrichmentTargetError`
- Build/validation errors: `BuildValidationError`, `InvalidGraphError`
- I/O errors: `DirectoryNotFoundError`

### SOC-5: Decompose builder-internals.ts

**Original:** Mixes ID generation, error creation, and validation delegation in one file.

**Refinement:** Split by responsibility:
- ID generation belongs with graph construction domain
- Validation delegation is unnecessary indirection - call assertions directly
- Error creation using suggestions belongs with error-recovery feature

### SOC-6: Entrypoint vs Domain Violation

**Original:** `RiviereBuilder` class mixes:
- Public API surface (entrypoint concern)
- Orchestration logic (use-case concern)
- Some domain decisions embedded in methods

**Refinement:** For a builder pattern library, the class IS the public API. The current design is acceptable because:
- Methods are thin mappings to domain operations
- Validation is delegated to assertion functions
- Complex logic is extracted (e.g., `mergeBehavior`, `findNearMatches`)

No structural change required, but document this as an intentional pattern for builder APIs.

---

## Tactical DDD Refinements

### DDD-1: Domain Isolation Violation

**Original:** `save()` method in `RiviereBuilder` contains infrastructure code (filesystem access).

**Refinement:** The `save()` method violates domain isolation by embedding `fs.access()` and `fs.writeFile()` directly. Options:
1. Remove `save()` from builder - callers use `build()` and handle I/O themselves
2. Accept a `Saver` interface and inject implementation (dependency inversion)

For a library, option 1 is cleaner - the caller controls I/O. The `save()` method is a convenience that couples the library to Node.js.

### DDD-2: Anemic Domain Model Detection

**Original:** `enrichComponent()` method contains business logic:
```typescript
if (component.type !== 'DomainOp') {
  throw new InvalidEnrichmentTargetError(id, component.type)
}
```

**Refinement:** This is acceptable orchestration-level validation (checking a precondition before operating). The actual domain logic is in `mergeBehavior()` and the deduplication functions. The model is not anemic because:
- `mergeBehavior()` contains business rules about merging
- `deduplicateStateTransitions()` knows what makes transitions equal
- The builder orchestrates these domain operations

### DDD-3: Missing Value Objects

**Original:** Component ID is a primitive string passed around. The schema has `ComponentId` but the builder uses raw strings.

**Refinement:** The `ComponentId` value object from `@living-architecture/riviere-schema` should be used internally:
- `generateComponentId()` should return `ComponentId`, not `string`
- Methods accepting IDs could accept `ComponentId | string` for convenience
- Internal storage could use `ComponentId` to enforce validation at boundaries

This would make the domain concept of "component identity" explicit throughout.

### DDD-4: Missing Value Objects - StateTransition Equality

**Original:** `deduplicateStateTransitions()` implements equality inline:
```typescript
e.from === item.from && e.to === item.to && e.trigger === item.trigger
```

**Refinement:** `StateTransition` should be a value object with an `equals()` method. Since this type comes from `riviere-schema`, this refinement would need to be applied there. For now, the domain logic is correctly isolated in the deduplication function.

### DDD-5: Rich Domain Language Audit

**Original terms with potential improvements:**

| Current | Issue | Suggested |
|---------|-------|-----------|
| `BuilderOptions` | Generic "options" | `GraphInitialization` or keep (acceptable for builder pattern) |
| `enrichComponent()` | Verb is good | Keep |
| `nearMatches()` | Good domain term | Keep |
| `registerComponent()` | Implementation detail | `addToGraph()` or keep as private |
| `BuilderGraph` | Internal type | `GraphUnderConstruction` to indicate mutable state |
| `InspectionGraph` | Parameter type for inspection | `GraphSnapshot` or `GraphForInspection` |

Most terms are acceptable. The "Builder" prefix consistently indicates the construction phase.

### DDD-6: Aggregate Boundary Analysis

**Original:** `RiviereBuilder` treats `graph.components[]` as mutable array accessible from multiple methods.

**Refinement:** The `RiviereBuilder` class IS the aggregate root for graph construction. It correctly:
- Controls all additions via methods (no direct array manipulation from outside)
- Enforces uniqueness invariant via `registerComponent()`
- Validates domain existence before creating components

The aggregate boundary is sound. The internal `graph` state is not exposed for direct mutation.

### DDD-7: Make Implicit Explicit - Graph States

**Original:** A graph under construction vs a validated graph are the same type with different guarantees.

**Refinement:** The design already distinguishes:
- `BuilderGraph` - internal, mutable, may be invalid
- `RiviereGraph` - output of `build()`, guaranteed valid

This could be made even more explicit with union types:
```typescript
type GraphState =
  | DraftGraph      // Under construction, mutable
  | ValidatedGraph  // Passed validation, immutable
```

But the current design with `build()` returning `RiviereGraph` provides sufficient clarity.

### DDD-8: Separate Generic Concepts

**Original:** `levenshteinDistance()` and `similarityScore()` are generic text algorithms.

**Refinement:** These are correctly identified as generic in the SoC analysis. They should move to `platform/domain/text-similarity/`. The domain-specific usage (component name matching) stays in `features/error-recovery/`.

---

## Summary of Refinements

| ID | Category | Severity | Description |
|----|----------|----------|-------------|
| SOC-1 | Structure | High | Introduce features/platform directories for library organization |
| SOC-2 | Structure | Medium | Extract generic utilities to platform/domain |
| SOC-3 | Cohesion | Medium | Split types.ts by feature |
| SOC-4 | Cohesion | Medium | Split errors.ts by feature |
| SOC-5 | Cohesion | Low | Decompose builder-internals.ts |
| SOC-6 | Structure | Info | Document builder pattern as intentional entrypoint design |
| DDD-1 | Isolation | Medium | Remove or inject I/O in save() method |
| DDD-2 | Anemia | Info | Model is not anemic - validation confirmed |
| DDD-3 | Value Object | Medium | Use ComponentId value object internally |
| DDD-4 | Value Object | Low | StateTransition equality (schema package concern) |
| DDD-5 | Language | Low | Minor naming improvements possible |
| DDD-6 | Aggregate | Info | Aggregate boundary is sound |
| DDD-7 | Explicitness | Low | Graph states adequately distinguished |
| DDD-8 | Generic | Medium | Confirmed need to extract text-similarity algorithms |
