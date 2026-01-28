# Critique for eclair

Reviewed: docs/design-reviews/eclair/refined.md

## CRITICAL

### Types Duplication Between Eclair and Riviere-Schema
- **What's wrong:** The design shows `platform/domain/riviere/` containing type definitions (branded-ids.ts, component-types.ts, edge-types.ts, etc.) that duplicate what already exists in `@living-architecture/riviere-schema`. The current codebase has `types/riviere.ts` which redefines `NodeId`, `EdgeId`, `DomainName`, `Node`, `Edge`, `RiviereGraph` etc.
- **Why it matters:** Two sources of truth for the same domain concepts. When schema evolves, eclair types may diverge. The current extractFlows.ts already imports from both `@living-architecture/riviere-query` (which uses schema types) and `@/types/riviere` (local copies). This creates type incompatibilities.
- **Suggested fix:** Delete local type definitions entirely. Re-export from `@living-architecture/riviere-schema` if path aliases are needed. Do not have `platform/domain/riviere/` at all.

### GraphContext Violates Single Responsibility
- **What's wrong:** GraphContext mixes multiple concerns: (1) graph state management, (2) demo mode detection, (3) demo graph fetching, (4) URL manipulation, (5) localStorage manipulation for code-link settings. The refined design claims it "only" handles graph state but proposes extracting demo loading to `platform/infra/demo/` while keeping the rest.
- **Why it matters:** GraphContext currently contains infrastructure code (fetch, localStorage, URL manipulation) inside what should be a pure state container. The dependency on infrastructure means the domain context cannot be tested without mocking browser APIs.
- **Suggested fix:** GraphContext should be a dumb state holder. Move ALL demo-related logic to a separate component/hook that consumes GraphContext, not the other way around.

### FlowTrace Discriminated Union Designed But Not Implemented
- **What's wrong:** The refined design proposes `FlowTrace` with `EntryStepFlowTrace` and `DownstreamFlowTrace` discriminated union. But the actual `FlowStep` interface in `extractFlows.ts` has no discriminator field. The `edgeType` can be null (for entry points) or 'sync'/'async', but this is not a proper discriminated union.
- **Why it matters:** The design document claims this is implemented ("Status: PASS") when it is not. The actual code uses `depth: number` where 0 indicates entry, not a discriminated union with `kind` field. This is a false claim in the design review.
- **Suggested fix:** Either implement the discriminated union as specified, or correct the design document to reflect reality. Do not claim "PASS" for unimplemented features.

### DomainVisualization Discriminated Union Does Not Exist
- **What's wrong:** The refined design proposes `InternalDomainVisualization` and `ExternalDomainVisualization` types. The actual code in `extractDomainMap.ts` uses `DomainNodeData` with an `isExternal?: boolean` optional field.
- **Why it matters:** Optional boolean is the exact anti-pattern DDD principle 6 warns against. The design claims "Status: PASS" for modeling states as distinct types when the implementation uses optional booleans.
- **Suggested fix:** Actually implement the discriminated union or correct the design document.

## HIGH

### React Adaptation Hides Missing Layers
- **What's wrong:** The design claims "React adaptation" where Pages act as entrypoints and projection functions as domain. But this elides the use-cases layer entirely. Looking at OverviewPage.tsx, it has 100+ lines of business logic inline including: computing domainInfos, building entryPoints arrays, filtering domains. This is orchestration logic mixed with rendering.
- **Why it matters:** The claim that "useMemo + projection function + state hooks" IS the use-cases layer is a rationalization. The actual code shows business logic scattered in Page components, not isolated in testable use-case functions.
- **Suggested fix:** Extract orchestration to explicit use-case functions. OverviewPage should call `buildDomainInventory(graph)` not contain 40 lines of mapping logic in useMemo.

### pluralize.ts in Domain Map is Generic Infrastructure
- **What's wrong:** The refined design places `pluralize.ts` in `features/domain-map/`. Pluralization is a generic text utility, not domain-specific to domain maps.
- **Why it matters:** Violates separation-of-concerns principle 2 (separate generic from domain-specific). When other features need pluralization, they will either duplicate or import across feature boundaries.
- **Suggested fix:** Move to `platform/infra/text/` or similar generic location.

### LayoutPosition Value Object Not Actually Needed
- **What's wrong:** The design proposes `LayoutPosition` as a value object with `distanceTo()` and `equals()` methods. But looking at the actual usage in `handlePositioning.ts` and `extractDomainMap.ts`, positions are just `{x: number, y: number}` objects passed to dagre/React Flow.
- **Why it matters:** Introducing a LayoutPosition class adds complexity without benefit. The code does not need `distanceTo()` or `equals()` - it computes angles with atan2 directly on coordinate differences.
- **Suggested fix:** Remove LayoutPosition from the design. The plain coordinate objects are sufficient.

### DomainConnection Value Object Over-Engineered
- **What's wrong:** The proposed `DomainConnection` value object has `isAsynchronous()`, `isSynchronous()`, `involvesExternalSystem()` methods. But looking at actual usage in `edgeAggregation.ts`, the code uses simple string comparisons and counts. The value object adds ceremony without simplifying any actual code.
- **Why it matters:** Premature abstraction. The current code is straightforward edge aggregation. Wrapping it in value objects adds indirection without making the code clearer.
- **Suggested fix:** Keep the simple aggregation approach. Value objects are for encapsulating invariants, not for wrapping two-field records.

### Projection Functions Are Just Adapters, Not Domain Logic
- **What's wrong:** The design elevates `extractFlows`, `extractDomainMap`, etc. as domain projection functions. But looking at the code, these functions are thin adapters that call `RiviereQuery` methods and reshape the output. `extractFlows` is 30 lines of type mapping.
- **Why it matters:** These are not rich domain logic - they are presentation adapters. Calling them "domain" overstates their importance and confuses where actual business rules live (they live in riviere-query).
- **Suggested fix:** Rename to view-adapters or presentation-adapters. Do not place in domain/. They belong in feature folders but should not be elevated to domain status.

## MEDIUM

### errors.ts at Root Violates Structure
- **What's wrong:** The design shows `errors.ts` at package root. But per separation-of-concerns, there should be no generic type-grouping files spanning multiple capabilities.
- **Why it matters:** A single errors.ts grows to contain GraphError, RenderingError, LayoutError, ContextError, CSSModuleError, DOMError, SchemaError. These belong to different layers and change for different reasons.
- **Suggested fix:** Split errors to live with their associated capabilities: GraphError with graph handling, LayoutError with layout, etc.

### types.ts in Full-Graph Contains Presentation Constants
- **What's wrong:** `features/full-graph/types.ts` contains `NODE_COLORS`, `EDGE_COLORS`, `NODE_RADII`, and `getDomainColor()`. These are presentation/theming concerns mixed with type definitions.
- **Why it matters:** Type definitions and color constants change for different reasons. The file name suggests types but contains visual configuration.
- **Suggested fix:** Split into separate files: one for D3 simulation types, one for visualization theme constants.

### useRiviereQuery Creates New Instance Every Render
- **What's wrong:** `useRiviereQuery` hook creates `new RiviereQuery(graph)` on every call, memoized only by graph reference. But RiviereQuery likely has internal caching/indexing. Multiple components calling this hook with the same graph prop will create duplicate instances.
- **Why it matters:** Memory overhead and potential cache fragmentation if RiviereQuery builds indexes.
- **Suggested fix:** Either ensure RiviereQuery is cheap to construct, or provide a single instance via context rather than recreating per-hook-call.

### CodeLinkSettings Cross-Feature Import
- **What's wrong:** OverviewPage.tsx imports `useCodeLinkSettings` from `@/features/flows/components/CodeLinkMenu/useCodeLinkSettings`. This creates a dependency from overview feature to flows feature.
- **Why it matters:** Violates principle that features should not depend on each other. Code link settings are a shared concern.
- **Suggested fix:** Move useCodeLinkSettings to `platform/infra/settings/` as the design suggests.

### External Domain Handling Is Implicit
- **What's wrong:** External domains are identified by string prefix "external:" in `extractDomainMap.ts`. The function `createExternalNodeId(name)` returns `external:${name}`. This convention is not documented as a domain concept.
- **Why it matters:** Implicit string conventions are error-prone. What happens if a domain is named "external:something"? The code conflates namespace prefix with domain type.
- **Suggested fix:** Use a proper discriminated type for internal vs external domains rather than string prefixing.

### compareGraphs Has Deep Knowledge of All Node Types
- **What's wrong:** `compareGraphs.ts` has separate functions for each node type: `getUINodeField`, `getAPINodeField`, `getDomainOpNodeField`, `getEventNodeField`, `getEventHandlerNodeField`. This is an exhaustive switch in disguise.
- **Why it matters:** When a new node type is added, compareGraphs must be updated. The logic for "what fields exist on a node type" is duplicated from the schema.
- **Suggested fix:** Consider a generic approach using schema metadata or reflection rather than hardcoded field extractors per type.

## LOW

### naming: extractDomainMap vs projectDomainConnections
- **What's wrong:** The design proposes renaming `extractDomainMap` to `projectDomainConnections`, but the actual function returns `DomainMapData` which contains nodes and edges, not just connections.
- **Why it matters:** The new name suggests it only handles connections, but the function builds the entire map visualization data.
- **Suggested fix:** Keep a name that reflects the full output: `buildDomainMapVisualization` or similar.

### EntityAccordion/EventAccordion Are Presentation Details
- **What's wrong:** The design lists `EntityAccordion/` and `EventAccordion/` as domain components within features/domains/components/. These are UI presentation components (accordion widgets).
- **Why it matters:** Accordion is a UI pattern, not a domain concept. Naming suggests domain significance where none exists.
- **Suggested fix:** These are fine as presentation components but should not be confused with domain concepts.

### ArchitectureMetrics Interface is Anemic
- **What's wrong:** The proposed `ArchitectureMetrics` is a pure data structure with readonly number fields. It has no behavior.
- **Why it matters:** This is fine for a DTO/read model, but the design calls it a "value object" which implies it should have behavior. It's just a plain interface.
- **Suggested fix:** Either add meaningful methods (comparisons, validation) or correctly label it as a read model, not a value object.

### GraphContext.tsx Proposed Location is Confusing
- **What's wrong:** The design places `GraphContext.tsx` in `platform/domain/riviere/`. But contexts are React infrastructure, not domain logic.
- **Why it matters:** GraphContext provides state management, which is infrastructure. Placing it in domain/ is conceptually wrong.
- **Suggested fix:** Move GraphContext to `platform/infra/graph-state/` or keep in shell/ as provider wiring.

### DomainDetailModal vs DomainInfoModal Naming
- **What's wrong:** There is both `DomainDetailModal/` and `DomainInfoModal.tsx`. Both appear to show domain information in modal form.
- **Why it matters:** Confusing naming - what distinguishes "detail" from "info"?
- **Suggested fix:** Clarify the distinction or consolidate if they serve the same purpose.

## Summary

The most important issues to address:

1. **Type Duplication is Critical** - Eclair should not redefine types that exist in riviere-schema. This creates two sources of truth and type mismatches.

2. **Design Document Claims "PASS" for Unimplemented Features** - FlowTrace and DomainVisualization discriminated unions are proposed but not implemented. The checklist should reflect reality.

3. **GraphContext is Doing Too Much** - The context mixes state management with infrastructure (fetch, localStorage, URL). This prevents clean testing and violates single responsibility.

4. **React Adaptation Obscures Missing Separation** - The claim that "Page components act as entrypoints" rationalizes having business logic inline in render components. Actual orchestration should be in separate functions.

5. **Value Objects Proposed Without Clear Benefit** - LayoutPosition and DomainConnection add complexity without simplifying code or enforcing invariants.

The design review correctly identifies many issues in the current structure, but some proposed solutions are over-engineered (value objects) while other claims of completion are premature (discriminated unions).
