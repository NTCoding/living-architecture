# ADR-007: eclair Architecture

**Status:** Accepted
**Date:** 2026-01-28
**Deciders:** @ntcoding

## Context

`eclair` is a React web application for viewing and exploring software architecture via Riviere graphs. The current implementation has:
- `features/` folder with good vertical slicing
- No `platform/` or `shell/` folders
- Shared code scattered across `lib/`, `hooks/`, `contexts/`, `types/`, `components/`
- `types/riviere.ts` (201 lines) duplicating types from `@living-architecture/riviere-schema`
- `GraphContext.tsx` mixing state management with demo mode, localStorage, and URL manipulation
- `GraphRenderingSetup.ts` (461 lines) and `extractDomainMap.ts` (411 lines) over 400-line limit
- `errors.ts` (79 lines) with 7 error classes spanning different capabilities
- Test fixtures in production source
- Cross-feature imports (OverviewPage imports from flows feature)

## Decision

### 1. React Application Structure

Adapt the features/platform/shell pattern for React applications:

**Within features:**
- `entrypoint/` - Page components (route entry points)
- `components/` - UI presentation components
- `hooks/` - React hooks for that feature
- `queries/` - Read operations (data transformation/extraction)
- `commands/` - Write operations (if any)
- `domain/` - Domain logic decoupled from UI (if any)

### 2. Package Structure

```text
apps/eclair/src/
├── features/
│   ├── comparison/
│   │   ├── entrypoint/
│   │   │   └── ComparisonPage.tsx
│   │   ├── components/
│   │   │   ├── ChangeFilters.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   ├── UploadZone.tsx
│   │   │   └── DomainConnectionDiff.tsx
│   │   ├── hooks/
│   │   └── queries/
│   │       ├── compare-graphs.ts
│   │       └── compute-domain-connection-diff.ts
│   ├── domain-map/
│   │   ├── entrypoint/
│   │   │   └── DomainMapPage.tsx
│   │   ├── components/
│   │   │   ├── DomainNode.tsx
│   │   │   └── DomainEdge.tsx
│   │   ├── hooks/
│   │   │   └── use-domain-map-interactions.ts
│   │   └── queries/
│   │       └── extract-domain-map.ts
│   ├── flows/
│   │   ├── entrypoint/
│   │   │   └── FlowsPage.tsx
│   │   ├── components/
│   │   │   ├── FlowCard.tsx
│   │   │   ├── FlowTrace.tsx
│   │   │   └── CodeLinkMenu.tsx
│   │   ├── hooks/
│   │   │   └── use-flows-state.ts
│   │   └── queries/
│   │       └── extract-flows.ts
│   ├── full-graph/
│   │   ├── entrypoint/
│   │   │   └── FullGraphPage.tsx
│   │   ├── components/
│   │   │   ├── ForceGraph.tsx
│   │   │   ├── GraphTooltip.tsx
│   │   │   ├── DomainFilters.tsx
│   │   │   ├── NodeTypeFilters.tsx
│   │   │   └── GraphSearch.tsx
│   │   ├── hooks/
│   │   │   ├── use-flow-tracing.ts
│   │   │   ├── use-node-depth.ts
│   │   │   └── use-node-search.ts
│   │   └── domain/
│   │       └── graph-focusing/
│   ├── overview/
│   │   ├── entrypoint/
│   │   │   └── OverviewPage.tsx
│   │   └── components/
│   │       ├── StatsItem.tsx
│   │       └── DomainCardSections.tsx
│   ├── domains/
│   │   ├── entrypoint/
│   │   │   └── DomainDetailPage.tsx
│   │   ├── components/
│   │   │   ├── DomainContextGraph.tsx
│   │   │   ├── DomainDetailModal.tsx
│   │   │   ├── EntityAccordion.tsx
│   │   │   └── EventAccordion.tsx
│   │   └── queries/
│   │       └── extract-domain-details.ts
│   ├── entities/
│   │   └── entrypoint/
│   │       └── EntitiesPage.tsx
│   ├── events/
│   │   └── entrypoint/
│   │       └── EventsPage.tsx
│   └── empty-state/
│       └── entrypoint/
│           └── EmptyState.tsx
├── platform/
│   ├── domain/
│   │   ├── graph-stats/
│   │   │   └── compute-graph-stats.ts
│   │   └── text/
│   │       └── pluralize.ts
│   └── infra/
│       ├── graph-state/
│       │   └── GraphContext.tsx
│       ├── demo/
│       │   └── use-demo-mode.ts
│       ├── theme/
│       │   └── ThemeContext.tsx
│       ├── export/
│       │   ├── ExportContext.tsx
│       │   └── export-graph.ts
│       ├── file-handling/
│       │   └── FileUpload.tsx
│       ├── settings/
│       │   └── use-code-link-settings.ts
│       ├── layout/
│       │   └── handle-positioning.ts
│       └── __fixtures__/
│           └── riviere-test-fixtures.ts
├── shell/
│   ├── App.tsx
│   ├── errors/
│   │   ├── eclair-error.ts
│   │   ├── graph-errors.ts
│   │   ├── rendering-errors.ts
│   │   └── context-errors.ts
│   └── components/
│       ├── AppShell.tsx
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── Logo.tsx
│       ├── ThemeSwitcher.tsx
│       ├── OrphanWarning.tsx
│       └── SchemaModal.tsx
└── main.tsx
```

### 3. Delete types/riviere.ts

The 201-line `types/riviere.ts` duplicates types from `@living-architecture/riviere-schema`. Delete entirely and import directly from the schema package. This eliminates two sources of truth.

### 4. Split GraphContext Concerns

Current `GraphContext.tsx` mixes:
- Graph state management
- Demo mode detection
- Demo graph fetching
- URL manipulation
- localStorage for code-link settings

Split into:
- `platform/infra/graph-state/GraphContext.tsx` - pure state only (setGraph, clearGraph, hasGraph)
- `platform/infra/demo/use-demo-mode.ts` - demo detection and loading
- `platform/infra/settings/use-code-link-settings.ts` - code link settings (already exists, just move)

### 5. Split Files Over 400 Lines

**GraphRenderingSetup.ts (461 lines):**
Split into focused modules within `full-graph/domain/`:
- `graph-rendering-setup.ts` - main setup orchestration
- `zoom-behavior.ts` - zoom handling
- `highlight-behavior.ts` - highlight updates
- `focus-mode-styling.ts` - focus mode visual styling

**extractDomainMap.ts (411 lines):**
Split into focused modules within `domain-map/queries/`:
- `extract-domain-map.ts` - main extraction orchestration
- `edge-aggregation.ts` - edge aggregation logic
- `external-domain-handling.ts` - external domain node creation

### 6. Split errors.ts by Capability

Current 79-line file with 7 error classes. Split by where errors are thrown:
- `shell/errors/graph-errors.ts` - GraphError, SchemaError
- `shell/errors/rendering-errors.ts` - RenderingError, LayoutError, DOMError
- `shell/errors/context-errors.ts` - ContextError, CSSModuleError

Base `EclairError` class can stay in shell/errors/ as shared base.

### 7. Move Cross-Feature Imports to Platform

`useCodeLinkSettings` is imported by OverviewPage from flows feature. Move to `platform/infra/settings/` to eliminate cross-feature dependency.

### 8. Move Test Fixtures to Platform

`lib/riviereTestFixtures.ts` is test infrastructure in production source. Move to `platform/infra/__fixtures__/`.

## Consequences

### Positive

- React-adapted features/platform/shell pattern established
- No type duplication with riviere-schema
- GraphContext has single responsibility (state only)
- All files under 400-line limit
- Errors co-located with capabilities
- No cross-feature imports
- Test fixtures separated from production

### Negative

- More directories and files
- Migration effort significant (many file moves)
- Breaking changes to internal imports

### Enforcement

Structural and dependency rules are enforced by dependency-cruiser (`.dependency-cruiser.mjs`). Run `pnpm depcruise` to check violations.

### Mitigations

- Feature structure already exists, mainly adding platform/ and shell/
- Migration can be incremental (one feature at a time)
- Internal imports - no public API changes

## Alternatives Considered

### Keep types/riviere.ts

**Why rejected:** Two sources of truth. When schema evolves, local types diverge. Already seeing type mismatches between riviere-query imports and local types.

### Keep GraphContext as-is

**Why rejected:** Mixes infrastructure (fetch, localStorage, URL) with state management. Cannot test graph state without mocking browser APIs.

### Keep errors.ts as Single File

**Why rejected:** 7 error classes spanning graph handling, rendering, contexts, and schema. These change for different reasons and belong with their capabilities.

### Use domain/ for React Components

**Why rejected:** React components are presentation layer, not domain logic. Using `components/` is idiomatic for React and clearer about intent.
