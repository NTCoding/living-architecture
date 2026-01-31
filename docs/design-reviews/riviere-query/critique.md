# Critique for riviere-query

Reviewed: docs/design-reviews/riviere-query/refined.md

## CRITICAL

### Refined design proposes wholesale restructuring without evidence of real problems

- **What's wrong:** The refined design proposes creating 12+ new directories (`branded-types/`, `component/`, `domain/`, `entity/`, `event/`, `flow/`, `cross-domain/`, `external/`, `validation/`, `diff/`, `stats/`, `depth/`) when the current flat structure has only ~15 production files. This is a 1:1 file-to-folder ratio in many cases.
- **Why it matters:** Over-engineering. The proposed structure adds navigation complexity and import path depth without solving a demonstrated pain point. A flat structure with 15 files is highly navigable. Creating folders with 1-2 files each violates the principle that folders should group related concepts - they become meaningless containers.
- **Suggested fix:** Keep flat structure. Only extract to folders when a natural grouping of 3+ related files emerges organically. The current structure is not broken.

### Entity class lives in event-types.ts (not addressed in implementation)

- **What's wrong:** The refined design claims to address the Entity class being in `event-types.ts` by moving it to `entity/entity.ts`. However, looking at the current code, `Entity` class imports `EntityName`, `DomainName`, `State`, `OperationName` from `domain-types.ts` and `EntityTransition` is also defined in `event-types.ts`. The Entity has zero relationship to events - it models domain entities with operations, states, transitions, and business rules.
- **Why it matters:** This is a separation of concerns violation. `event-types.ts` mixes two unrelated concepts: entities (domain aggregates) and events (messaging). The refined design acknowledges this but Phase 1 is marked "Low Risk" when it actually requires careful import graph refactoring.
- **Suggested fix:** Move Entity and EntityTransition to a dedicated file (could be `entity.ts` or `domain-queries.ts` which already uses it). Do not create a folder for a single file.

### Branded type factory proposal adds complexity without value

- **What's wrong:** The refined design proposes changing from `parseComponentId(id)` to `ComponentId.from(id)`. This is a breaking API change that provides zero functional benefit. The current `parse*` functions are already single-purpose factories that brand strings.
- **Why it matters:** The justification "parse suggests transformation" is weak. The functions do parse and validate via Zod. Changing to static factory pattern requires creating 10 new object namespaces (one per branded type) that duplicate what already works. This is churn, not improvement.
- **Suggested fix:** Keep `parse*` functions. If semantic clarity is genuinely needed, rename to `brand*` as a simple find-replace, not a structural change.

## HIGH

### Refined design marks several checks as PASS/N/A that should be FAIL

- **What's wrong:**
  1. "Principle 4: Avoid anemic domain model - ACCEPTABLE" when all query result types are pure data interfaces with no behavior.
  2. "Principle 7: Design aggregates around invariants - N/A" claiming read-only library has no invariants.
- **Why it matters:** These are cop-outs. The `Entity` class does have behavior (`hasStates()`, `hasBusinessRules()`, `firstOperationId()`) but these are anemic helpers, not rich domain methods. Real domain behavior would be `canTransitionTo(state)`, `isInTerminalState()`, `operationsRequiringState(state)`. The library has invariants: a ComponentId should always reference an existing component, a Flow should always have valid steps. The library just ignores them.
- **Suggested fix:** Either acknowledge these as acceptable trade-offs for a query library (not pretend they do not exist) or add value object behavior where meaningful.

### Duplicated link key creation logic

- **What's wrong:** The `createLinkKey` function is defined identically in both `flow-queries.ts` (line 66-71) and `graph-diff.ts` (line 59-64). Both create a synthetic `LinkId` by concatenating source and target when no explicit ID exists.
- **Why it matters:** Code duplication. If the link key format changes, two places need updating. This is a candidate for extraction to a shared utility.
- **Suggested fix:** Extract `createLinkKey` to a shared location (e.g., `domain-types.ts` alongside the `parseLinkId` function, or a new `link-utils.ts` if keeping flat structure).

### RiviereQuery facade is a god class with 30+ methods

- **What's wrong:** `RiviereQuery.ts` has grown to 667 lines with methods spanning components, links, validation, domains, entities, flows, events, diffs, stats, and external systems. It delegates to query functions but still exposes every capability through a single class.
- **Why it matters:** Single Responsibility Principle violation. The facade makes it convenient for consumers but masks the true API surface area. Adding any new query type requires modifying this class. Testing requires understanding the entire class.
- **Suggested fix:** Consider whether the facade is necessary at all. The individual query functions are already exported and usable directly. The facade could be optional or broken into focused facades (`ComponentQueries`, `FlowQueries`, `DomainQueries`) if consumers need a class-based API.

### Type aliasing obscures intent in component-queries imports

- **What's wrong:** In `RiviereQuery.ts`, imports are renamed on import:
  ```typescript
  import {
    componentById as lookupComponentById,
    componentsInDomain as filterByDomain,
    componentsByType as filterByType,
  } from './component-queries'
  ```
- **Why it matters:** The original function names are fine (`componentById`, `componentsInDomain`, `componentsByType`). Renaming them on import adds cognitive overhead for readers who then see `lookupComponentById` but find `componentById` in the source. If the names need to change, change them at the source.
- **Suggested fix:** Remove the aliasing. Use original names or rename at source if clarity is needed.

## MEDIUM

### EntryPointTypes inlined as magic Set instead of explicit constant

- **What's wrong:** In `flow-queries.ts` line 21:
  ```typescript
  const entryPointTypes = new Set<ComponentType>(['UI', 'API', 'EventHandler', 'Custom'])
  ```
  This is defined inline inside `findEntryPoints`. The refined design proposes extracting to `ENTRY_POINT_TYPES` constant, which is correct but not implemented.
- **Why it matters:** This is implicit domain knowledge. What makes something an entry point is a domain concept that should be named and discoverable. Currently it is hidden in function implementation.
- **Suggested fix:** Extract to module-level constant with documentation explaining the domain concept.

### Graph validation is shallow

- **What's wrong:** `graph-validation.ts` only checks: (1) link source/target exist, (2) custom types are defined. It does not validate: cycles that could cause infinite traversal, duplicate component IDs, component domain references match metadata domains, event handlers reference existing events.
- **Why it matters:** The validation is incomplete for a production-grade query library. Users may encounter runtime errors from invalid graphs that passed validation.
- **Suggested fix:** Document known limitations or expand validation. Consider adding `validateStrict()` vs `validateBasic()` if performance is a concern.

### Inconsistent handling of optional graph.externalLinks

- **What's wrong:** In `flow-queries.ts`:
  ```typescript
  const externalLinks = graph.externalLinks ?? []
  ```
  This null coalescing is needed because `externalLinks` is optional. But this pattern is scattered wherever external links are used.
- **Why it matters:** Defensive coding at call sites rather than at the source. If the schema allows optional externalLinks, the library should normalize this once during construction.
- **Suggested fix:** Normalize `graph.externalLinks` to empty array in `RiviereQuery` constructor or `assertValidGraph`.

### transitionsForEntity silently loses information

- **What's wrong:** In `domain-queries.ts`, `transitionsForEntity` converts state changes to transitions but loses the operation's domain context. If the same entity exists in multiple domains with the same operation name, transitions become ambiguous.
- **Why it matters:** Data loss. The `EntityTransition` interface only has `triggeredBy: OperationName`, not the full operation reference or domain.
- **Suggested fix:** Either include domain in EntityTransition or document that entities are implicitly scoped to a single domain.

### statesForEntity ordering algorithm has edge cases

- **What's wrong:** The `orderStatesByTransitions` function attempts to order states from initial to terminal by following the transition graph. However:
  1. If there are multiple initial states, only one path is followed
  2. If there are cycles, the function may not terminate predictably (though `visited` set prevents infinite loops, the order is arbitrary for cyclic graphs)
  3. Branching transitions (one state leads to multiple states) only follow `transitionMap.get(s)` which keeps the last transition per source state
- **Why it matters:** The function produces non-deterministic output for complex state machines. The docstring promises "ordered states" but the algorithm cannot guarantee meaningful ordering for all valid state machines.
- **Suggested fix:** Document limitations clearly or improve algorithm to handle branching/merging state machines. Consider returning unordered set if ordering is not reliable.

### diff API is confusing - comparing this.graph to other

- **What's wrong:** The `diffGraphs(current, other)` function and `RiviereQuery.diff(other)` method have confusing semantics. Looking at the code:
  ```typescript
  const added = other.components.filter((c) => !thisIds.has(c.id))
  const removed = current.components.filter((c) => !otherIds.has(c.id))
  ```
  "added" means "in other but not in current". This is backwards from typical diff semantics where "added" means "in new version, not in old".
- **Why it matters:** API confusion. If I call `newGraph.diff(oldGraph)`, I expect "added" to be things in newGraph. But the implementation returns things in oldGraph as "added".
- **Suggested fix:** Clarify naming or fix semantics. Consider `diffFrom(other)` (changes from other to this) vs `diffTo(other)` (changes from this to other).

## LOW

### Test fixtures in production source tree

- **What's wrong:** `riviere-graph-fixtures.ts` is in `src/` not `test/`. The refined design correctly identifies this should move to `test/fixtures/`.
- **Why it matters:** Test infrastructure pollutes production bundle. Minor issue since tree-shaking may eliminate it, but cleaner to separate.
- **Suggested fix:** Move to `test/fixtures/`.

### PascalCase filename for RiviereQuery.ts

- **What's wrong:** All other files use kebab-case (`domain-queries.ts`, `event-types.ts`) but the main class file uses PascalCase (`RiviereQuery.ts`).
- **Why it matters:** Inconsistent naming convention. Minor but adds friction.
- **Suggested fix:** Rename to `riviere-query.ts`.

### Spec files co-located with source

- **What's wrong:** Test files (`*.spec.ts`) are in the same directory as source files.
- **Why it matters:** This is a style choice that the project has made. Not inherently wrong, but mixed with the proposal to move fixtures to `test/`, it creates inconsistency.
- **Suggested fix:** Either keep all test infrastructure in `src/` (including fixtures) or move all to `test/`. Be consistent.

### parseDomainName used inconsistently

- **What's wrong:** Some places use `parseDomainName(value)` to create branded DomainName, others use raw strings. For example, `componentsInDomain(graph, domainName)` accepts `string`, not `DomainName`.
- **Why it matters:** The branded types do not provide compile-time safety if they are only used inconsistently.
- **Suggested fix:** Either commit to branded types throughout the public API or remove them. Half-measures provide no benefit.

### ENTRY_POINT_TYPES includes EventHandler which is arguably not an entry point

- **What's wrong:** The entry point definition includes `EventHandler` as an entry point type. But event handlers are triggered by events, they do not initiate flows - they receive them.
- **Why it matters:** Domain modeling question. If an EventHandler has no incoming links, it might be orphaned (nothing publishes the event it handles) rather than being a true entry point.
- **Suggested fix:** Validate whether EventHandler should be an entry point or if orphaned handlers should be flagged differently.

## Summary

The refined design over-engineers the solution. The current codebase has real issues:
1. Entity class in event-types.ts (misplaced)
2. Duplicated createLinkKey function
3. Magic inline constants (entry point types)
4. Inconsistent branded type usage

But the proposed restructuring into 12+ directories for 15 files is overkill. The facade class is already large and adding more structure makes it harder to navigate, not easier.

**Most important issues to address:**
1. Move Entity/EntityTransition out of event-types.ts to their own file (not folder)
2. Extract duplicated createLinkKey to shared location
3. Export ENTRY_POINT_TYPES as named constant
4. Fix diff API semantics or improve documentation
5. Do NOT create elaborate folder structure - the flat structure is fine for this package size
