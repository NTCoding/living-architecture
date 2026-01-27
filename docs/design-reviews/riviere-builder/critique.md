# Critique for riviere-builder

Reviewed: docs/design-reviews/riviere-builder/refined.md

## CRITICAL

### save() method still exists with Node.js filesystem imports

- **What's wrong:** The refined design explicitly states "Remove `save()` method from `RiviereBuilder`" to achieve browser compatibility and domain isolation. However, the actual code at `/Users/nicko/code/living-architecture-issue-203-architecture-review-and-adr-fo/packages/riviere-builder/src/builder.ts` lines 1-2 imports `node:fs` and `node:path`, and lines 864-876 implement the `save()` method with filesystem I/O.
- **Why it matters:** This is a direct contradiction between the refined design and implementation. The package cannot be browser-compatible while bundling Node.js filesystem APIs. Infrastructure concerns (filesystem I/O) are polluting the domain, violating DDD principle 1 (isolate domain logic from infrastructure).
- **Suggested fix:** Remove `save()` method and the Node.js imports. Update documentation to show callers using `builder.build()` followed by their own filesystem write.

### DirectoryNotFoundError exists only to support save()

- **What's wrong:** The `DirectoryNotFoundError` class in `errors.ts` (lines 129-137) exists solely to support the `save()` method's directory existence check. If `save()` is removed per the design, this error class becomes orphaned infrastructure-specific code.
- **Why it matters:** The error hierarchy contains infrastructure-specific errors mixed with domain errors, violating separation of concerns. Domain errors should describe business rule violations, not filesystem problems.
- **Suggested fix:** Remove `DirectoryNotFoundError` when removing `save()`.

## HIGH

### RiviereBuilder is a God Class with too many responsibilities

- **What's wrong:** The `RiviereBuilder` class (builder.ts) spans 877 lines and handles: graph construction, component registration, linking, enrichment, inspection (stats, warnings, orphans), validation, serialization, querying, and file I/O. This violates both separation of concerns (multiple unrelated responsibilities) and DDD principle 3 (use cases should be distinct intentions).
- **Why it matters:** The refined design proposes splitting into features (graph-construction, graph-enrichment, graph-inspection, error-recovery) but the current implementation bundles everything. Changes to validation logic could accidentally affect linking. Testing requires the entire class.
- **Suggested fix:** Extract inspection methods (`warnings()`, `stats()`, `orphans()`, `validate()`) to a separate `GraphInspector` class. Extract `query()` since it creates a different object. Keep `RiviereBuilder` focused on construction and linking.

### Internal graph state is publicly exposed

- **What's wrong:** Line 133: `graph: BuilderGraph` is a public field. External code can directly mutate `builder.graph.components.push(...)` or `builder.graph.links = []`, bypassing all invariant enforcement.
- **Why it matters:** This violates DDD principle 7 (aggregates protect invariants). The duplicate component check in `registerComponent()`, domain existence validation, and all other safeguards can be circumvented. The aggregate boundary is meaningless if external code can access internal state directly.
- **Suggested fix:** Make `graph` private: `private graph: BuilderGraph`. Add explicit getter methods if read-only access is needed.

### types.ts is a generic type-grouping file spanning multiple capabilities

- **What's wrong:** The `types.ts` file contains 185 lines of types spanning: builder options, all component inputs (UI, API, UseCase, DomainOp, Event, EventHandler, Custom), link inputs, near-match types, stats types, warning types, and enrichment types. These serve completely different features.
- **Why it matters:** This violates SoC checklist item 13 ("no generic type-grouping files spanning multiple capabilities"). When adding a new component type, you modify the same file as when changing warning behavior. Types are not co-located with their usage.
- **Suggested fix:** Split per the refined design: inspection-types.ts (BuilderStats, BuilderWarning, WarningCode), match-types.ts (NearMatchQuery, NearMatchResult, NearMatchMismatch, NearMatchOptions), and component inputs with their respective add methods or in a dedicated construction-types.ts.

### errors.ts is a generic error-grouping file

- **What's wrong:** All 12 error classes are in a single `errors.ts` file spanning: domain errors (DuplicateDomainError, DomainNotFoundError), component errors (DuplicateComponentError, ComponentNotFoundError), custom type errors (CustomTypeNotFoundError, CustomTypeAlreadyDefinedError, MissingRequiredPropertiesError), enrichment errors (InvalidEnrichmentTargetError), graph errors (InvalidGraphError), and validation errors (BuildValidationError, MissingSourcesError, MissingDomainsError), plus infrastructure error (DirectoryNotFoundError).
- **Why it matters:** Errors for unrelated features are coupled together. The refined design proposes feature-specific error files: construction-errors.ts, enrichment-errors.ts, validation-errors.ts, lookup-errors.ts.
- **Suggested fix:** Co-locate errors with the code that throws them, per the refined design.

## MEDIUM

### builder-internals.ts mixes concerns

- **What's wrong:** `builder-internals.ts` contains four unrelated functions: `generateComponentId` (ID generation), `createComponentNotFoundError` (error creation with suggestions), `validateDomainExists`, `validateCustomType`, `validateRequiredProperties` (all validation wrappers). These functions have different reasons to change and different callers.
- **Why it matters:** The file name "internals" is vague and doesn't describe what the functions have in common. SoC principle 5: "Separate functions that don't have related names."
- **Suggested fix:** Move `generateComponentId` to `domain/component-id-generator.ts`. Keep assertions in `builder-assertions.ts`. Move error creation to `error-recovery/` or co-locate with `ComponentNotFoundError`.

### deduplicate.ts mixes generic and domain-specific deduplication

- **What's wrong:** `deduplicate.ts` contains two functions: `deduplicateStrings` (generic string array deduplication) and `deduplicateStateTransitions` (domain-specific StateTransition deduplication using from/to/trigger equality).
- **Why it matters:** Generic capabilities should be in `platform/`, domain-specific logic in `features/`. The refined design correctly separates: `deduplicateStrings` to `platform/domain/collection-utils/` and `deduplicateStateTransitions` to `features/graph-enrichment/domain/`.
- **Suggested fix:** Apply the proposed split. The domain-specific function knows about StateTransition equality rules, so it belongs with enrichment domain logic.

### Validation delegated entirely to external package

- **What's wrong:** `validateGraph()` in inspection.ts (line 176-178) simply creates a `RiviereQuery` and calls its `validate()` method. All validation logic is outsourced to riviere-query package.
- **Why it matters:** If riviere-builder has its own invariants beyond schema compliance (e.g., checking for orphans as warnings vs errors, verifying enrichment consistency), there's no place to add them. The builder doesn't distinguish its validation concerns from schema validation.
- **Suggested fix:** Consider whether builder-specific validation rules exist. If so, compose them with schema validation. Document explicitly that validation is purely schema-based if that's intentional.

### enrichComponent mutates argument directly

- **What's wrong:** The `enrichComponent` method (lines 589-616) directly mutates the component object it finds: `component.entity = enrichment.entity`, `component.stateChanges = [...]`. This is mutation-in-place rather than immutable state transitions.
- **Why it matters:** While the builder is mutable by design, direct mutation makes it harder to reason about state changes and track what changed. It also means partial failures could leave the component in an inconsistent state (e.g., if `behavior` merge throws after `entity` was already set).
- **Suggested fix:** Consider creating a new component object with all changes applied atomically, then replacing it in the components array. This makes the operation transactional.

### resume() performs minimal validation

- **What's wrong:** `RiviereBuilder.resume()` (lines 157-174) only checks that sources exist. It doesn't verify: domain existence, component ID validity, link target existence, custom type consistency, or schema compliance.
- **Why it matters:** A malformed graph can be loaded and corrupt the builder state. Subsequent operations might fail in confusing ways. The invariants that `RiviereBuilder.new()` enforces are not enforced on resume.
- **Suggested fix:** Call `validateGraph()` on the input before restoring. Document that resume accepts only valid RiviereGraph objects. Consider whether partial/draft graphs should use a different restoration mechanism.

### NearMatchQuery uses primitive string for name instead of value object

- **What's wrong:** `NearMatchQuery` uses `name: string` for the search term. The refined design mentions using `ComponentId` value object from schema, but the near-match logic operates on raw strings.
- **Why it matters:** Inconsistent use of value objects. The `createSourceNotFoundError` does extract `id.name()` from a `ComponentId`, but the general `findNearMatches` API accepts raw strings, losing type safety.
- **Suggested fix:** Either accept `ComponentId` for the query and extract parts internally, or document that the string-based API is intentional for flexibility.

## LOW

### Inconsistent function naming: assert vs validate

- **What's wrong:** `builder-assertions.ts` has functions named `assertDomainExists`, `assertCustomTypeExists`, `assertRequiredPropertiesProvided`. `builder-internals.ts` wraps these as `validateDomainExists`, `validateCustomType`, `validateRequiredProperties`. Two naming conventions for the same concept.
- **Why it matters:** Cognitive overhead. Are "assert" and "validate" semantically different? Both throw errors. The indirection adds no value.
- **Suggested fix:** Pick one naming convention. If "assert" is preferred (implies throwing), remove the validate wrappers and call assert functions directly.

### Feature directory structure not implemented

- **What's wrong:** The refined design proposes: `features/graph-construction/`, `features/graph-enrichment/`, `features/graph-inspection/`, `features/error-recovery/`, and `platform/domain/`. The actual code is flat: `src/builder.ts`, `src/types.ts`, `src/errors.ts`, etc.
- **Why it matters:** The refined design analysis passes its own checklist, but the implementation doesn't match. The design document is aspirational, not descriptive.
- **Suggested fix:** Either implement the proposed structure or update the design document to reflect reality and explain why the flat structure is acceptable for a ~600 line package.

### Missing domain/ folder in features per SoC pattern

- **What's wrong:** If implementing the refined structure, features like `graph-inspection` have multiple domain files but no orchestrating use-case. The refined design acknowledges "no separate use-cases needed - they are called directly by the builder" but this means the builder IS the use-case for all features.
- **Why it matters:** The SoC pattern expects features to have their own entry points. Having one mega-class orchestrate four features' worth of domain logic doesn't achieve the separation the pattern intends.
- **Suggested fix:** Consider whether the builder should be split into multiple collaborating classes (GraphConstructor, GraphEnricher, GraphInspector, etc.) that are composed together, rather than one class calling into domain functions.

### ComponentId.parse used inconsistently

- **What's wrong:** In `createComponentNotFoundError` (builder-internals.ts line 25), the code does `ComponentId.parse(id)` on a string that was already generated by `generateComponentId`. The ID format is internal knowledge duplicated across parsing and generation.
- **Why it matters:** If the ID format changes, both places need updating. The generation function returns a string but the error recovery needs the parsed value object.
- **Suggested fix:** Have `generateComponentId` return a `ComponentId` value object. Callers that need the string can call `toString()`. This ensures the format is defined in one place.

### No explicit state machine for graph construction phases

- **What's wrong:** The builder allows adding components, linking, enriching, and building in any order. There's no explicit modeling of construction phases (e.g., "defining structure" vs "linking" vs "enriching" vs "finalizing").
- **Why it matters:** DDD principle 6 suggests making implicit concepts explicit. If there are constraints about what operations are valid when (e.g., can you enrich after build? can you add components after linking?), these aren't enforced or documented.
- **Suggested fix:** Document the intended usage pattern. If phase constraints exist, consider modeling them (e.g., `builder.finalize()` returns an immutable object that prevents further mutation).

### menu test ambiguity for inspection methods

- **What's wrong:** The refined design claims `warnings()`, `stats()`, `orphans()` pass the menu test as user intentions. But these are more like queries on graph state rather than actions a user would request from a "menu" of features.
- **Why it matters:** DDD principle 3 menu test: "If you described your application's features to a user like a menu, would this be on it?" A user might say "Build graph" but probably not "Calculate stats."
- **Suggested fix:** Consider reframing: these are not use cases, they're query methods on the aggregate. This is fine, but don't claim they pass the menu test. They're legitimate read operations, just not "intentions."

## Summary

The most critical issues are:

1. **save() method contradicts the refined design** - Must be removed for browser compatibility and domain isolation. This is an explicit design decision that wasn't implemented.

2. **Public graph field violates aggregate invariant protection** - Making this private is a minimal fix with high impact on correctness guarantees.

3. **RiviereBuilder is doing too much** - Consider extracting inspection and query capabilities to separate classes.

4. **Centralized types.ts and errors.ts files** - Split per the refined design to achieve co-location and cohesion.

The refined design document is well-reasoned but represents aspirational architecture, not current implementation. The gap between design and code needs reconciliation - either implement the proposed structure or update the design to justify the simpler flat structure for this package size.
