# Critique for riviere-extract-ts

Reviewed: docs/design-reviews/riviere-extract-ts/refined.md

## CRITICAL

### Missing use-cases/ layer violates Separation of Concerns architecture

- **What's wrong:** The refined design has `features/component-extraction/entrypoint/` going directly to `domain/`. There is no `use-cases/` layer. Every feature should have `entrypoint/`, `use-cases/`, and `domain/`. The design claims "entrypoint/ only where needed" but this contradicts the mandatory three-layer structure.
- **Why it matters:** Without use-cases/, orchestration logic will leak into either entrypoint or domain. The entrypoint becomes fat (parsing + orchestration + output mapping) or domain becomes polluted with workflow concerns. This is exactly what the Separation of Concerns skill prohibits.
- **Suggested fix:** Add `use-cases/` to each feature. Move orchestration from `extractDraftComponents` into a use case. The entrypoint should only parse input and invoke the use case.

### predicate-matching and value-extraction features have no entrypoint/

- **What's wrong:** These features have only `domain/` folders. According to Separation of Concerns, features must have `entrypoint/`, `use-cases/`, and `domain/`. Missing entrypoint means these are not features at all.
- **Why it matters:** If they are not features (no entry point, no use case), they should be in `platform/domain/`. The design incorrectly classifies shared capabilities as features. Predicate matching and value extraction are used by component-extraction, making them horizontal concerns.
- **Suggested fix:** Either (a) move `predicate-matching/` and `value-extraction/` to `platform/domain/` since they are shared capabilities with no entry points, or (b) if they truly are features, add the missing `entrypoint/` and `use-cases/` layers.

### config-resolution feature has no entrypoint/ or use-cases/

- **What's wrong:** Same issue as above. `config-resolution/` has only `domain/`. This is a capability, not a feature.
- **Why it matters:** Config resolution is a shared capability called by the extraction entry point. It has no user-facing entry point of its own.
- **Suggested fix:** Move to `platform/domain/config-resolution/`.

### Shell exports directly from domain/ - violates entrypoint rule

- **What's wrong:** The shell/index.ts exports `matchesPredicate` directly from `features/predicate-matching/domain/`. Shell should only export from entrypoints, not domain.
- **Why it matters:** Separation of Concerns mandates that external callers interact through entrypoints, never directly with domain. This creates coupling to internal implementation details.
- **Suggested fix:** Either (a) create proper entrypoints for these exports, or (b) acknowledge these are platform capabilities and move them there.

## HIGH

### DraftComponent is not a proper value object

- **What's wrong:** The refined design shows `DraftComponent` as a plain interface with `SourceLocation` as a class. But `DraftComponent` itself should be a value object or at minimum have an `equals()` method for identity comparison. The design extracts `SourceLocation` but leaves `DraftComponent` as an anemic data carrier.
- **Why it matters:** Tactical DDD Principle 8 says to extract value objects liberally. A DraftComponent has no identity beyond its attributes - same type, name, location, domain means same component. Without `equals()`, comparison logic will be duplicated across consumers.
- **Suggested fix:** Make `DraftComponent` a proper value object class with `equals()` and potentially factory methods for construction validation.

### Implicit dependency on minimatch buried in extractor

- **What's wrong:** The current implementation uses `minimatch` for glob matching in `findMatchingModule`. The refined design does not address this at all. This is infrastructure (file path matching) mixed with domain logic.
- **Why it matters:** Tactical DDD Principle 1 - domain should be isolated from infrastructure. Minimatch is a generic file system utility, not domain logic.
- **Suggested fix:** Move glob matching to `platform/infra/glob-matching/` or abstract it behind an interface that the use case injects.

### DetectionTarget type is incomplete

- **What's wrong:** `DetectionTarget = 'classes' | 'methods' | 'functions'` matches the current `FIND_TARGETS` array but the refined design does not explain why these are the only three. The domain model should express what detection targets mean and why they matter.
- **Why it matters:** Making implicit explicit (Tactical DDD Principle 6) means more than creating types - it means the types should communicate intent. Why can we detect classes, methods, and functions but not interfaces, enums, or type aliases?
- **Suggested fix:** Add documentation to `DetectionTarget` explaining the architectural rationale, or expand the type to include all AST node types that can be components.

### ExtractionSource type is unused in the extraction functions

- **What's wrong:** The design proposes `ExtractionSource` as an explicit type, but the actual extraction functions (`extractFromClassName`, `extractFromProperty`, etc.) do not use this type. Each function implicitly knows its source.
- **Why it matters:** If the type exists but is not used, it is dead code. If it should be used but is not, the design is incomplete.
- **Suggested fix:** Either use `ExtractionSource` in a discriminated union pattern for extraction rules, or remove it from the design.

### ExtractedValue duplicates existing LiteralResult

- **What's wrong:** The refined design shows `ExtractedValue` with `kind: 'string' | 'number' | 'boolean' | 'strings' | 'signature' | 'parameters'`. Meanwhile, `LiteralResult` already exists with `kind: 'string' | 'number' | 'boolean'`. This creates two parallel type hierarchies.
- **Why it matters:** Unnecessary duplication leads to confusion. Which type should callers use? What is the relationship between them?
- **Suggested fix:** Either make `LiteralResult` a subset of `ExtractedValue` explicitly (e.g., `type LiteralResult = Extract<ExtractedValue, { kind: 'string' | 'number' | 'boolean' }>`) or consolidate into one type.

### platform/ has no infra/ folder

- **What's wrong:** The refined design shows `platform/domain/` only. Separation of Concerns mandates `platform/` contains `domain/` and `infra/`. The checklist says "platform/ contains only domain/ and infra/ (nothing else)" but the design omits infra entirely.
- **Why it matters:** Without `platform/infra/`, infrastructure code has nowhere to go. ts-morph interaction is infrastructure (external library wrapping). File path normalization is infrastructure.
- **Suggested fix:** Add `platform/infra/` and move ts-morph specific code there (e.g., AST node type guards, project creation, file loading).

## MEDIUM

### No aggregate boundaries defined

- **What's wrong:** Tactical DDD Principle 7 says to design aggregates around invariants. The refined design never identifies invariants or aggregate boundaries. What must always be true about a DraftComponent? What must be true about a resolved config?
- **Why it matters:** Without explicit invariants, business rules scatter and enforcement becomes inconsistent.
- **Suggested fix:** Identify invariants for each domain concept. For example: "A DraftComponent must always have a non-empty name" - this should be enforced at construction time, not validated later.

### transform-pipeline.ts has vague responsibility

- **What's wrong:** The design shows `platform/domain/string-transforms/transform-pipeline.ts` with `applyTransforms(value: string, transform: Transform): string`. But the existing code already has `applyTransforms` in `transforms.ts`. Why is pipeline a separate file?
- **Why it matters:** Separation of Concerns Principle 4 - separate functions that depend on different state. If both files depend on the same Transform type, they should be in the same file.
- **Suggested fix:** Combine `transforms.ts` and `transform-pipeline.ts` or clarify what distinct state/responsibility each has.

### literal-detection in platform/domain/ depends on ts-morph types

- **What's wrong:** The design puts `literal-detection.ts` in `platform/domain/ast-literals/` but it directly uses ts-morph's `Expression` and `SyntaxKind` types. This is domain code coupled to infrastructure (ts-morph library).
- **Why it matters:** Tactical DDD Principle 1 - domain isolated from infrastructure. ts-morph is an external library, not domain.
- **Suggested fix:** Either (a) move to `platform/infra/ast-literals/` since it is ts-morph specific, or (b) abstract ts-morph behind a port/adapter interface.

### resolveModule function is public in shell but internal to config-resolution

- **What's wrong:** The design shows `resolveModule` as a public function exported from `features/config-resolution/domain/resolve-module.ts`. But `resolveModule` is an internal implementation detail of `resolveConfig`.
- **Why it matters:** Exposing internal functions creates coupling. If someone imports `resolveModule` directly, they bypass the intended use case.
- **Suggested fix:** Keep `resolveModule` private. Only export `resolveConfig` and its types.

### Naming: "extract" used inconsistently

- **What's wrong:** The entry point is `extractDraftComponents`, but domain functions are `matchesPredicate` and `extractFrom*`. The naming implies extraction happens in two places.
- **Why it matters:** Tactical DDD Principle 2 - use rich domain language consistently. Is "extraction" the domain operation or is "matching" + "value extraction" the domain? The terminology is unclear.
- **Suggested fix:** Clarify the domain language. Perhaps: `detectComponents` (top level), `matchesPredicate` (filtering), `extractValue` (reading values). Or: `extractComponents`, `evaluatePredicate`, `readFrom*`.

### TestFixtureError in production code

- **What's wrong:** `literal-detection.ts` exports `TestFixtureError` which is explicitly documented as "Internal error thrown when test fixture setup fails." This is test infrastructure in production code.
- **Why it matters:** Test concerns should not be in production domain code.
- **Suggested fix:** Move `TestFixtureError` to a test helper file that is not part of the production build.

## LOW

### Trade-offs section acknowledges but does not address complexity

- **What's wrong:** The design notes "The package is ~600 lines across ~10 files" and "adds directory depth." It acknowledges the cost but does not justify why the benefit outweighs it for a package this small.
- **Why it matters:** Premature abstraction. A 600-line package may not need features/platform/shell structure. The structure exists to manage complexity that may not exist yet.
- **Suggested fix:** Consider a simpler structure until the package grows. Or document specific complexity that justifies the structure now.

### Breaking changes not versioned

- **What's wrong:** The design lists breaking changes (renamed functions, changed imports) but does not mention semver major version bump.
- **Why it matters:** Consumers of the package will break silently if breaking changes are released without major version increment.
- **Suggested fix:** Explicitly state this requires a major version bump (0.x to 1.0 or similar).

### shell/index.ts exports too much

- **What's wrong:** The shell exports 25+ items including individual extraction functions (`extractFromClassName`, `extractFromProperty`, etc.). This is a large public API surface for a 600-line package.
- **Why it matters:** Large APIs are harder to maintain and version. Changes to any exported item are potentially breaking.
- **Suggested fix:** Consider exporting fewer items. Do consumers really need individual extraction functions, or would a single `extractValue(rule, context)` suffice?

### Incremental adoption path is backwards

- **What's wrong:** The migration path suggests adding `SourceLocation` first (Phase 1), then renaming functions (Phase 2), then restructuring (Phase 4). But the structure change should come first - it determines where files live.
- **Why it matters:** Migrating code location, then file contents, then location again wastes effort.
- **Suggested fix:** Restructure first (new folders), then migrate code into them, then refine types/names.

### Source location line should be positive integer

- **What's wrong:** `SourceLocation` accepts any `number` for line. Negative line numbers are invalid.
- **Why it matters:** Invalid states should be unrepresentable (Tactical DDD Principle 6).
- **Suggested fix:** Validate line >= 1 in SourceLocation constructor, or use a branded type `PositiveLine`.

## Summary

The most important issues to address:

1. **Architecture violation**: The design claims to follow Separation of Concerns but places domain-only folders in `features/` (predicate-matching, value-extraction, config-resolution). These are shared capabilities that belong in `platform/domain/`. True features need entrypoint + use-cases + domain.

2. **Missing use-cases layer**: Component extraction has entrypoint but no use-cases. This will cause orchestration logic to leak into the wrong place.

3. **Shell exports domain directly**: The shell should not export from `domain/` folders. This couples consumers to implementation details.

4. **Infrastructure in domain**: ts-morph types and minimatch are infrastructure concerns mixed into domain code.

5. **Value object incompleteness**: DraftComponent should be a proper value object with equals(), not just an interface.

The refined design improves naming and adds explicit types, but the structural organization contradicts the Separation of Concerns principles it claims to follow.
