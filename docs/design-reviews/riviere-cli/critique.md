# Critique for riviere-cli

Reviewed: docs/design-reviews/riviere-cli/refined.md

## CRITICAL

### Missing Aggregate Root Invariant: Duplicate Links

- **What's wrong:** The `Architecture.link()` method in section 3 creates a new `Link` and pushes it to `this.links` without checking if an identical link already exists. Nothing prevents creating multiple identical links between the same components.
- **Why it matters:** Duplicate links violate the graph integrity invariant. Querying the architecture would return incorrect results (e.g., counting connections, traversing flows). The architecture graph becomes inconsistent.
- **Suggested fix:** Add duplicate link detection before pushing. Check if a link with the same `from`, `to`, and `linkType` already exists.

### Anemic Domain Model: Architecture.addComponent Delegates All Logic

- **What's wrong:** The `Architecture.addComponent()` method delegates to `createTypedComponent()` which just switches on type and calls static factory methods. The aggregate root doesn't enforce cross-component invariants. Business rules are scattered across individual component classes.
- **Why it matters:** Per tactical DDD principle 4, business logic should live in domain objects with use cases only orchestrating. The switch statement pattern suggests an anemic model where the aggregate is just a data container routing to other classes.
- **Suggested fix:** Consider whether component-type-specific validation belongs in the aggregate root. If components have cross-component invariants (e.g., "UI components in domain X can only link to API components in domain X"), the aggregate should enforce them.

### Entrypoint Imports Domain Directly via parseTypeSpecificInput

- **What's wrong:** The entrypoint example in section 1 (line 166 of refined.md) shows `parseTypeSpecificInput(options)` which suggests the entrypoint is aware of component type variations. The entrypoint is doing domain-level parsing decisions, not just mapping CLI strings to a command object.
- **Why it matters:** Violates separation of concerns checklist item 14: "entrypoint/ is thin (parse input -> invoke use-case -> map output) and never imports from domain/". The entrypoint should not know about component type semantics.
- **Suggested fix:** Move type-specific input parsing to the use case. Entrypoint should pass raw options; use case or domain decides how to interpret them.

### Value Object SourceLocation Uses Primitive for filePath

- **What's wrong:** In section 5, `SourceLocation` wraps `repository` in a `RepositoryUrl` value object, but `filePath` remains a raw string. The `filePath` has validation requirements (non-empty, potentially path format rules) that are not enforced.
- **Why it matters:** Violates tactical DDD principle 8: "Extract immutable value objects liberally." Inconsistent treatment of similar concepts. A malformed file path could propagate through the system without early detection.
- **Suggested fix:** Create a `FilePath` value object with appropriate validation (non-empty, valid path characters, etc.).

## HIGH

### Missing Validation: Link Type Consistency

- **What's wrong:** The design shows `LinkType` as a value in `Architecture.link()`, but there's no validation that the link type is semantically valid for the component types being linked. For example, an async link from a UI component may not make domain sense.
- **Why it matters:** The architecture graph could contain semantically invalid links that pass structural validation but represent impossible flows. This undermines the purpose of capturing "living architecture."
- **Suggested fix:** Define which link types are valid for which component type pairs. Enforce this in the aggregate root's `link()` method.

### Generic Type-Grouping File: platform/domain/value-objects/

- **What's wrong:** The design places all value objects in `platform/domain/value-objects/` as a flat folder. This is a generic type-grouping approach (collecting all things of type "value object" together).
- **Why it matters:** Violates separation of concerns checklist item 13: "Verify no generic type-grouping files (types.ts, errors.ts, validators.ts) spanning multiple capabilities." Value objects should be co-located with the domain concepts they represent or grouped by domain concept, not by "being a value object."
- **Suggested fix:** Group value objects by the domain concept they belong to. E.g., `platform/domain/architectural-classification/component-type.ts` is good. `platform/domain/source-tracking/source-location.ts`, `platform/domain/source-tracking/repository-url.ts`, `platform/domain/source-tracking/file-path.ts` would be better than a flat `value-objects/` folder.

### Unclear Boundary: module-ref-resolver in extract-architecture/domain

- **What's wrong:** `extract-architecture/domain/module-ref-resolver.ts` suggests resolving module references, which sounds like file system or package resolution logic. This likely belongs in infrastructure, not domain.
- **Why it matters:** Violates tactical DDD principle 1: "Domain is isolated from infrastructure." If module ref resolution involves file system access or package.json parsing, it's infrastructure wrapped in domain clothing.
- **Suggested fix:** Clarify what `module-ref-resolver` does. If it resolves file paths or reads package.json, move to `platform/infra/`. If it's purely mapping module names to architecture concepts, rename to clarify domain intent.

### Component Display in explore-architecture/domain is Presentation Concern

- **What's wrong:** `features/explore-architecture/domain/component-display.ts` sounds like presentation logic (how to display components), not domain logic.
- **Why it matters:** Display/presentation logic belongs in entrypoint or infrastructure (cli-presentation), not domain. The domain should not know how components are rendered for CLI output.
- **Suggested fix:** Move component display formatting to `platform/infra/cli-presentation/` or keep it in the entrypoint layer if it's command-specific.

### Use Case Missing: No Dedicated Use Cases for Multiple Entrypoints

- **What's wrong:** The design shows 10 entrypoint commands in `author-architecture` but only 6 use cases. Commands like `add-source`, `define-custom-type`, `enrich`, `finalize`, `link-http` have no corresponding use case listed.
- **Why it matters:** Either these commands share use cases (which may be appropriate) or they're missing from the design. The mismatch suggests incomplete specification that will cause confusion during implementation.
- **Suggested fix:** Explicitly document which use cases support which entrypoints. If `add-source`, `enrich`, `finalize` have distinct user goals, add corresponding use cases. If they're thin wrappers around existing use cases, document that relationship.

## MEDIUM

### Over-Abstraction: Separate Reader and Writer for Architecture Persistence

- **What's wrong:** Section 6 shows `ArchitectureReader` and `ArchitectureWriter` as separate classes with separate constructors taking different dependencies (`jsonParser` only in reader).
- **Why it matters:** Reading and writing the same file format are closely related operations. Separating them creates potential for serialization/deserialization mismatches. Most operations need both (read, modify, write). This is premature separation before a concrete need emerges.
- **Suggested fix:** Consider a single `ArchitecturePersistence` or `ArchitectureRepository` class that handles both operations. Split only if there's a real need (e.g., read-only queries at scale).

### ErrorBoundary Couples Domain Errors to CLI Error Codes

- **What's wrong:** The `ErrorBoundary.toCliError()` method (section 7) maps domain errors directly to CLI error codes inside an infrastructure class. This creates coupling between domain error types and presentation concerns.
- **Why it matters:** Adding a new domain error requires modifying the error boundary infrastructure. The mapping knowledge is buried in infrastructure rather than being explicit.
- **Suggested fix:** Domain errors should carry enough information for any presentation layer to map them. Consider a `toErrorInfo()` method on domain errors, or an explicit error mapping registry.

### Implicit Dependency: Architecture.serialize() Not Shown

- **What's wrong:** The `ArchitectureWriter.save()` method calls `architecture.serialize()`, but the `Architecture` class definition in section 3 doesn't show this method.
- **Why it matters:** The serialization format is a critical contract. Without showing how `serialize()` works, we don't know if the Architecture aggregate handles its own serialization (potential SRP violation) or delegates appropriately.
- **Suggested fix:** Document the serialization approach. If the aggregate serializes itself, consider extracting a `ArchitectureSerializer` to separate the concern.

### HTTPMethod in platform/domain/http-method/ is Generic Concept

- **What's wrong:** `platform/domain/http-method/http-method.ts` defines HTTP methods (GET, POST, etc.). HTTP methods are a generic web concept, not specific to architecture documentation domain.
- **Why it matters:** Violates tactical DDD principle 5: "Separate generic concepts." HTTP methods could exist in any web application. They're not specific to "living architecture" domain.
- **Suggested fix:** Move to `platform/infra/http/` as an infrastructure concern, or if you want to keep it pure, just use string literal types directly where needed.

### Unclear: What Validates Custom Component Metadata Against CustomTypeDefinition?

- **What's wrong:** The `createCustomComponent` method checks if the custom type exists but doesn't validate that the provided metadata matches the custom type's expected properties/schema.
- **Why it matters:** Custom types exist to allow user-defined component types with specific metadata requirements. Without validation, the custom type definition is decorative rather than enforced.
- **Suggested fix:** `CustomTypeDefinition` should define required/optional properties. `CustomComponent.create()` should validate metadata against the definition.

## LOW

### Naming: "author-architecture" Feature Name is Verbose

- **What's wrong:** `features/author-architecture/` is a long name for what is essentially the "builder" feature (matching `riviere builder` CLI subcommand).
- **Why it matters:** Longer paths make imports verbose. The current CLI uses "builder" terminology, creating inconsistency between code structure and user-facing commands.
- **Suggested fix:** Consider `features/builder/` for consistency with CLI, or update CLI to use `riviere author` if the domain language prefers "author."

### Extraction Config in Feature Domain vs Platform

- **What's wrong:** `features/extract-architecture/domain/extraction-config.ts` suggests extraction configuration is feature-specific domain. But extraction config schemas are defined in the separate `riviere-extract-config` package.
- **Why it matters:** The boundary between this package's domain and the external config schema package is unclear. Duplicate concepts or leaky abstractions may emerge.
- **Suggested fix:** Clarify the relationship. This domain file should be a thin adapter over the external config package, not duplicate config concepts.

### Missing Error Handling: What Happens When ArchitectureWriter.save Fails?

- **What's wrong:** The use case example in section 2 calls `architectureWriter.save()` but doesn't show error handling for write failures (disk full, permissions, etc.).
- **Why it matters:** Infrastructure failures need explicit handling. Silent failures could leave users thinking their changes were saved.
- **Suggested fix:** Document the error handling strategy. Either the writer throws infrastructure exceptions that the error boundary catches, or the use case explicitly handles failure cases.

### Shell Dependency: bin.ts and cli.ts Separation is Unclear

- **What's wrong:** The design shows both `shell/bin.ts` and `shell/cli.ts`. The relationship and responsibilities aren't specified.
- **Why it matters:** Two files in shell/ when the principle is "thin wiring only" suggests possible duplication or unclear separation.
- **Suggested fix:** Clarify: `bin.ts` is the executable entry point (shebang, process.argv), `cli.ts` creates the command tree. Document this explicitly or collapse if unnecessary.

### Inconsistent Naming: APIComponent vs ApiType

- **What's wrong:** `APIComponent` uses all-caps "API" but `ApiType` uses PascalCase "Api". Inconsistent casing within the same domain.
- **Why it matters:** Inconsistency creates cognitive load and potential bugs (typos when developers expect one pattern but use another).
- **Suggested fix:** Pick one convention and apply consistently: either `APIComponent`/`APIType` or `ApiComponent`/`ApiType`.

## Summary

The most critical issues to address are:

1. **Duplicate link invariant** - The aggregate root doesn't prevent duplicate links, compromising graph integrity.

2. **Anemic domain model risk** - The switch-based component creation pattern may scatter business rules rather than centralizing them in the aggregate.

3. **Entrypoint doing domain work** - Type-specific input parsing in the entrypoint layer violates the thin entrypoint principle.

4. **Generic type-grouping** - The `value-objects/` folder violates the principle of grouping by domain concept rather than by technical type.

5. **Use case/entrypoint mismatch** - Several commands lack corresponding use cases in the design, suggesting incomplete specification.

The design shows good structural intent (features/platform/shell separation, value objects, aggregate root), but the details reveal domain logic leakage, missing invariant enforcement, and some premature abstractions. The migration plan is reasonable but should address these issues before implementation proceeds.
