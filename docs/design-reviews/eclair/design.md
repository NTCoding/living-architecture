# Design Review: eclair

## Package Overview

**Purpose:** Web application for viewing and exploring software architecture via Riviere graphs. Provides visual representations of domains, flows, entities, events, and full component graphs.

**Dependencies:**
- `@living-architecture/riviere-query` - Query API for graph data
- `@living-architecture/riviere-schema` - Schema validation
- `@xyflow/react` - React Flow for domain map visualization
- `d3` - D3.js for force-directed graph visualization
- `dagre` - Graph layout algorithms
- `react-router-dom` - Client-side routing
- `zod` - Runtime type validation

## Current Structure

```text
apps/eclair/src/
  App.tsx                           # Root component, routing, providers
  errors.ts                         # Error class hierarchy
  components/
    AppShell/                       # Main layout shell
    FileUpload/                     # File drop zone
    Header/                         # App header
    Logo/                           # Brand logo
    OrphanWarning/                  # Warning for orphan nodes
    SchemaModal/                    # JSON schema viewer
    Sidebar/                        # Navigation sidebar
    ThemeSwitcher/                  # Theme toggle
  contexts/
    ExportContext.tsx               # Export handler registration
    GraphContext.tsx                # Global graph state
    ThemeContext.tsx                # Theme state
  features/
    comparison/                     # Graph version comparison
    domain-map/                     # Domain-level visualization
    domains/                        # Domain detail views
    empty-state/                    # No-graph-loaded state
    entities/                       # Entity listing
    events/                         # Event listing
    flows/                          # Flow tracing views
    full-graph/                     # D3 force-directed graph
    overview/                       # Dashboard overview
  hooks/
    useRiviereQuery.ts              # Query hook wrapper
  lib/
    exportGraph.ts                  # PNG/SVG export utilities
    graphStats.ts                   # Stats calculation
    handlePositioning.ts            # Edge handle positioning
    riviereTestFixtures.ts          # Test fixtures
  test/
    setup.ts                        # Test configuration
    svg.d.ts                        # SVG type declarations
  types/
    riviere.ts                      # Graph type definitions
    theme.ts                        # Theme types
```

## Separation of Concerns Checklist

### 1. Verify features/, platform/, shell/ exist at root

**Status:** PARTIAL

The app has `features/` which aligns with vertical slices. However:
- No `platform/` folder for shared horizontals
- No `shell/` folder for thin wiring

Instead, shared code is distributed across:
- `components/` - UI components used across features
- `contexts/` - React contexts for global state
- `lib/` - Utility functions
- `hooks/` - Shared React hooks
- `types/` - Type definitions

### 2. Verify platform/ contains only domain/ and infra/

**Status:** N/A (no platform/ folder exists)

Shared code lives in `components/`, `contexts/`, `lib/`, `hooks/`, `types/`.

### 3. Verify each feature contains only entrypoint/, use-cases/, domain/

**Status:** FAIL

Features use a different structure. Each feature folder contains:
- Page components (e.g., `FlowsPage.tsx`, `DomainMapPage.tsx`)
- Domain/extraction logic (e.g., `extractFlows.ts`, `extractDomainMap.ts`)
- Child components in `components/` subfolder
- React hooks in `hooks/` subfolder

This is not the entrypoint/use-cases/domain pattern, but follows a more React-idiomatic "page + components + logic" pattern.

### 4. Verify shell/ contains no business logic

**Status:** N/A (no shell/ folder exists)

`App.tsx` acts as the wiring layer:
- Sets up providers (GraphProvider, ExportProvider)
- Defines routes
- Contains thin wrapper components that invoke `useRequiredGraph()` and pass to page components

This is appropriately thin. The only business logic is `useRequiredGraph()` which throws if no graph is loaded.

### 5. Verify code belonging to one feature is in features/[feature]/

**Status:** PASS

Each feature is self-contained:
- `features/comparison/` - All comparison logic and components
- `features/domain-map/` - Domain visualization with extractDomainMap, DomainNode, DomainEdge
- `features/flows/` - Flow tracing with extractFlows, FlowCard, FlowTrace
- `features/full-graph/` - Force graph with D3, tooltips, filters
- `features/domains/` - Domain detail views with context graphs
- `features/overview/` - Dashboard with stats and domain cards
- `features/entities/` - Entity listing
- `features/events/` - Event listing
- `features/empty-state/` - Upload prompt

### 6. Verify shared business logic is in platform/domain/

**Status:** PARTIAL FAIL

Shared logic exists but is not in a platform/domain folder:
- `lib/graphStats.ts` - Used by multiple features for stats
- `lib/exportGraph.ts` - Used by DomainMapPage and FullGraphPage
- `lib/handlePositioning.ts` - Used by extractDomainMap
- `hooks/useRiviereQuery.ts` - Creates RiviereQuery from graph
- `types/riviere.ts` - Central type definitions (202 lines)

These belong in a shared location but naming does not follow the platform/ convention.

### 7. Verify external service wrappers are in platform/infra/

**Status:** PASS (with caveat)

No true external services exist. The app is client-side only. Browser APIs used:
- `localStorage` - Direct usage in ThemeContext, GraphContext
- `fetch` - Direct usage in GraphContext for demo graph
- `FileReader` - Direct usage in FileUpload, ComparisonPage

These are used directly rather than wrapped, which is acceptable for a small frontend app.

### 8. Verify custom folders are inside domain/, not use-cases/

**Status:** PARTIAL PASS

Features with custom folders:
- `features/flows/components/` - FlowCard, FlowTrace, CodeLinkMenu, DomainBadge, NodeTypeBadge
- `features/flows/hooks/` - useFlowsState
- `features/domain-map/components/` - DomainNode, DomainEdge
- `features/domain-map/hooks/` - useDomainMapInteractions
- `features/domains/components/` - DomainContextGraph, DomainDetailModal, EntityAccordion, EventAccordion
- `features/full-graph/components/` - ForceGraph, DomainFilters, GraphSearch, GraphTooltip, NodeTypeFilters
- `features/full-graph/hooks/` - useFlowTracing, useNodeDepth, useNodeSearch
- `features/full-graph/graphFocusing/` - Filter and focus utilities

Custom folders follow React conventions (components/, hooks/) rather than domain/ pattern. For a React app, this is idiomatic.

### 9. Verify each function relies on same state as others in its class/file

**Status:** MIXED

**PASS:**
- `errors.ts` - All error classes extend EclairError
- `exportGraph.ts` - All functions for file export
- `graphStats.ts` - Single stats calculation function
- `handlePositioning.ts` - Single positioning function
- Each extraction file (extractFlows, extractDomainMap, extractDomainDetails) - focused on one transformation

**FAIL:**
- `types/riviere.ts` (202 lines) - Contains:
  - 9 branded type schemas (NodeId, EdgeId, DomainName, etc.)
  - 14 interface definitions for nodes, edges, links, metadata
  - Multiple node types (UINode, APINode, UseCaseNode, etc.)
  - Graph structure types

  These change for different reasons: schema evolution, new node types, validation rules.

### 10. Verify each file name relates to other files in its directory

**Status:** PASS

Files within each feature directory share naming themes:
- `features/comparison/` - ComparisonPage, compareGraphs, computeDomainConnectionDiff, ChangeFilters, StatsBar
- `features/domain-map/` - DomainMapPage, extractDomainMap, calculateTooltipPosition, pluralize
- `features/flows/` - FlowsPage, extractFlows
- `features/full-graph/` - FullGraphPage, graphFocusing/, ForceGraph, GraphTooltip

### 11. Verify each directory name describes what all files inside have in common

**Status:** PASS

- `features/comparison` - Graph comparison functionality
- `features/domain-map` - Domain relationship visualization
- `features/flows` - Flow tracing and display
- `features/full-graph` - Complete graph visualization
- `features/domains` - Domain detail views
- `components/` - Reusable UI components
- `contexts/` - React context providers
- `lib/` - Utility functions
- `types/` - TypeScript definitions

### 12. Verify use-cases/ contains only use-case files

**Status:** N/A

No use-cases/ folder exists. React patterns use page components that orchestrate hooks and extraction functions.

### 13. Verify no generic type-grouping files spanning multiple capabilities

**Status:** FAIL

- `types/riviere.ts` (202 lines) - Contains types for:
  - All node types (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)
  - Edge and link types
  - Source location
  - Graph metadata
  - External system types

  These serve multiple features and change for different reasons.

- `errors.ts` (80 lines) - Contains 7 error classes:
  - EclairError (base)
  - GraphError
  - RenderingError
  - LayoutError
  - ContextError
  - CSSModuleError
  - DOMError
  - SchemaError

  Each error is thrown by different parts of the app. However, error classes are small and don't contain logic, so this is acceptable.

### 14. Verify entrypoint/ is thin

**Status:** PASS

`App.tsx` is appropriately thin:
- Sets up routing and providers
- Defines wrapper components that get graph and pass to page components
- No business logic beyond `useRequiredGraph()` guard

Each page component (FlowsPage, DomainMapPage, etc.) receives graph as prop and internally:
1. Calls extraction function (e.g., `extractFlows(graph)`)
2. Manages local UI state
3. Renders components

This matches the thin entrypoint pattern adapted for React.

## Identified Issues

### Issue 1: types/riviere.ts is a Monolithic Type File

**Principle violated:** No generic type-grouping files (Checklist 13), Separate functions that depend on different state (Principle 4)

**Current state:** 202-line file containing:
- Branded type schemas (9 types)
- Node type interfaces (7 node types)
- Edge, Link, External system types
- Graph metadata

**Impact:** Any node type change touches the same file as edge type changes. No cohesion around why types change together.

**Recommended split:**
```text
types/
  branded-ids.ts        # NodeId, EdgeId, DomainName branded schemas
  node-types.ts         # UINode, APINode, UseCaseNode, etc.
  edge-types.ts         # Edge, EdgePayload, LinkType
  external-types.ts     # ExternalTarget, ExternalLink
  graph-types.ts        # RiviereGraph, GraphMetadata
  source-location.ts    # SourceLocation, OperationSignature
```

### Issue 2: Missing platform/ Folder for Shared Horizontals

**Principle violated:** Separate feature-specific from shared capabilities (Principle 2)

**Current state:** Shared code scattered across:
- `lib/` - Export, stats, positioning utilities
- `hooks/` - useRiviereQuery
- `components/` - AppShell, Header, Sidebar, etc.
- `contexts/` - Graph, Theme, Export contexts
- `types/` - Type definitions

**Impact:** No clear separation between "used by one feature" vs "used by many features". A developer must grep to understand dependencies.

**Recommended structure:**
```text
src/
  features/           # Verticals (unchanged)
  platform/
    domain/
      riviere/        # Types and utilities for graph data
    infra/
      browser/        # localStorage, file reading wrappers
  shell/
    App.tsx           # Routing, providers
    components/       # Layout: AppShell, Header, Sidebar
```

### Issue 3: Browser API Usage is Scattered

**Principle violated:** Separate external clients from domain-specific code (Principle 1)

**Current state:** Direct browser API usage in:
- `ThemeContext.tsx` - localStorage.getItem/setItem
- `GraphContext.tsx` - localStorage.setItem, fetch, window.location
- `FileUpload.tsx` - FileReader
- `ComparisonPage.tsx` - FileReader
- `exportGraph.ts` - URL.createObjectURL, document.createElement

**Impact:** If localStorage API changes or needs to be mocked for SSR, many files need updating.

**Recommendation:** For a client-side only app, this is acceptable. If SSR becomes a requirement, wrap browser APIs:
```text
platform/infra/browser/
  storage.ts          # localStorage wrapper
  file-reader.ts      # FileReader wrapper
  download.ts         # Blob download utilities
```

### Issue 4: Contexts Mix State and Side Effects

**Principle violated:** Separate intent from execution (Principle 3)

**Current state:** `GraphContext.tsx` handles:
1. Graph state management (`useState`, `setGraph`, `clearGraph`)
2. Demo mode detection (`useIsDemoMode`)
3. Demo graph fetching (`fetchAndValidateDemoGraph`)
4. URL manipulation (`window.history.replaceState`)
5. localStorage writes for code link settings

**Impact:** Demo loading is intertwined with graph state. Testing requires mocking multiple browser APIs.

**Recommendation:** Split into:
- `GraphContext.tsx` - Pure state management
- `useDemoMode.ts` - Demo detection and loading hook
- Store settings in a dedicated settings context or service

### Issue 5: Test Fixtures in Production Source

**Principle violated:** Separation of test infrastructure

**Current state:** `lib/riviereTestFixtures.ts` exists in production source

**Impact:** Test fixtures are bundled with production code.

**Recommendation:** Move to `src/__fixtures__/` or feature-specific test directories.

### Issue 6: Features Import Shared Types/Hooks Inconsistently

**Principle violated:** Consistent dependency direction

**Current state:**
- Some features use `@/types/riviere` for types
- Some features use `@/hooks/useRiviereQuery`
- Some features directly import from `@living-architecture/riviere-query`

**Impact:** Inconsistent patterns make it harder to understand data flow.

**Recommendation:** Establish clear convention:
- Features import from `@living-architecture/riviere-query` for query functionality
- Features import from `@/platform/domain/riviere` for app-specific type extensions

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| features/platform/shell structure | PARTIAL | Has features/, missing platform/ and shell/ |
| Feature self-containment | PASS | Each feature is well-isolated |
| Shared logic location | FAIL | Scattered across lib/, hooks/, components/ |
| External services isolated | PASS | No external services (client-side app) |
| Same-state cohesion | MIXED | types/riviere.ts mixes many concerns |
| Related names | PASS | Files within directories relate well |
| Directory naming | PASS | Directories describe contents |
| No generic type files | FAIL | types/riviere.ts is a grab-bag |
| Thin entrypoint | PASS | App.tsx is appropriately thin |

## Priority Recommendations

1. **High:** Split `types/riviere.ts` into cohesive type modules
2. **Medium:** Create `platform/` structure for shared horizontals (lib/, hooks/, reusable components)
3. **Medium:** Extract demo loading logic from GraphContext
4. **Low:** Move test fixtures out of production source
5. **Low:** Standardize feature imports from shared modules

## Architectural Observations

The eclair app demonstrates good vertical slicing with its features/ structure. Each feature:
- Has its own page component
- Contains extraction/transformation logic
- Owns its child components and hooks

The main architectural gaps are:
1. No clear separation between "feature-specific" and "shared" code
2. Large type file that spans all features
3. Contexts that mix state management with side effects

For a React frontend app, the current structure is functional and maintainable. The features/ pattern is the strongest part of the architecture. The recommendations focus on improving cohesion in shared code rather than restructuring features.
