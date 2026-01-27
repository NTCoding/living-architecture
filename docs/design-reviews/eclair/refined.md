# Refined Design: eclair

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

## Refined Structure

```text
apps/eclair/src/
  features/                           # Verticals (feature-specific code)
    comparison/                       # Graph version comparison
      ComparisonPage.tsx
      compareGraphs.ts
      computeDomainConnectionDiff.ts
      ChangeFilters.tsx
      StatsBar.tsx
      UploadZone.tsx
      DomainConnectionDiff.tsx
    domain-map/                       # Domain-level visualization
      DomainMapPage.tsx
      projectDomainConnections.ts     # renamed from extractDomainMap
      calculateTooltipPosition.ts
      edgeAggregation.ts
      pluralize.ts
      components/
        DomainNode/
        DomainEdge/
      hooks/
        useDomainMapInteractions.ts
    domains/                          # Domain detail views
      DomainDetailPage.tsx
      DomainDetailView.tsx
      projectDomainInventory.ts       # renamed from extractDomainDetails
      domainNodeBreakdown.ts
      components/
        DomainContextGraph/
        DomainDetailModal/
        EntityAccordion/
        EventAccordion/
    empty-state/                      # No-graph-loaded state
      EmptyState.tsx
    entities/                         # Entity listing
      EntitiesPage.tsx
    events/                           # Event listing
      EventsPage.tsx
    flows/                            # Flow tracing views
      FlowsPage.tsx
      projectFlowTraces.ts            # renamed from extractFlows
      components/
        FlowCard/
        FlowTrace/
        CodeLinkMenu/
        DomainBadge/
        NodeTypeBadge/
      hooks/
        useFlowsState.ts
    full-graph/                       # D3 force-directed graph
      FullGraphPage.tsx
      types.ts
      components/
        ForceGraph/
        DomainFilters/
        GraphSearch/
        GraphTooltip/
        NodeTypeFilters/
      graphFocusing/
        filterByNodeType.ts
        focusModeConstants.ts
        themeFocusColors.ts
      hooks/
        useFlowTracing.ts
        useNodeDepth.ts
        useNodeSearch.ts
    overview/                         # Dashboard overview
      OverviewPage.tsx
      DomainCardSections.tsx

  platform/                           # Horizontals (shared capabilities)
    domain/                           # Shared business logic
      graph-analysis/
        computeArchitectureMetrics.ts # renamed from computeGraphStats
      layout/
        handlePositioning.ts
        LayoutPosition.ts             # value object
      riviere/
        branded-ids.ts                # NodeId, EdgeId, DomainName, etc.
        component-types.ts            # UINode, APINode, etc.
        edge-types.ts                 # Edge, EdgePayload
        external-types.ts             # ExternalTarget, ExternalLink
        graph-types.ts                # RiviereGraph, GraphMetadata
        source-location.ts            # SourceLocation, OperationSignature
        GraphContext.tsx              # graph state management only
        useRiviereQuery.ts
        index.ts                      # re-exports
      visualization/
        DomainConnection.ts           # value object
        DomainVisualization.ts        # discriminated union
        FlowTrace.ts                  # discriminated union
    infra/                            # Technical utilities
      demo/
        useDemoMode.ts
        fetchDemoGraph.ts
      file-export/
        exportGraph.ts
      file-handling/
        FileUpload/
      schema-viewer/
        SchemaModal/
      settings/
        useCodeLinkSettings.ts
      theming/
        ThemeContext.tsx
        ThemeSwitcher/
      warnings/
        OrphanWarning/

  shell/                              # Wiring layer (routing, providers)
    App.tsx
    components/
      AppShell/
      Header/
      Sidebar/
      Logo/

  __fixtures__/                       # Test infrastructure
    riviereTestFixtures.ts

  errors.ts                           # Error class hierarchy
  test/
    setup.ts
    svg.d.ts
```

## Separation of Concerns Checklist (Refined)

| Check | Status | Notes |
|-------|--------|-------|
| 1. features/, platform/, shell/ exist | PASS | All three folders present |
| 2. platform/ contains only domain/ and infra/ | PASS | Correctly organized |
| 3. Features contain entrypoint/, use-cases/, domain/ | ADAPTED | React pattern: Page components act as entrypoints, extraction functions as domain logic |
| 4. shell/ contains no business logic | PASS | Only routing and provider wiring |
| 5. Feature code stays in feature folder | PASS | Each feature is self-contained |
| 6. Shared business logic in platform/domain/ | PASS | Graph analysis, layout, riviere types |
| 7. External wrappers in platform/infra/ | PASS | File handling, theming, demo loading |
| 8. Custom folders inside appropriate layer | PASS | components/, hooks/ within features |
| 9. Same-state cohesion | PASS | Type files split by change reason |
| 10. Related file names | PASS | Files within directories relate |
| 11. Directory names describe contents | PASS | Clear naming |
| 12. use-cases/ contains only use-cases | N/A | React pattern adaptation |
| 13. No generic type-grouping files | PASS | Types split into cohesive modules |
| 14. Thin entrypoint | PASS | Pages receive graph, invoke projection, render |

## Tactical DDD Checklist (Refined)

| Check | Status | Notes |
|-------|--------|-------|
| 1. Domain isolated from infrastructure | PASS | Extraction functions are pure; infra in platform/infra/ |
| 2. Rich domain language | PASS | projectFlowTraces, DomainConnection, ArchitectureMetrics |
| 3. Use cases are user intentions | ADAPTED | Page components represent user views (valid for UI apps) |
| 4. Business logic in domain objects | PASS | Projection functions contain transformation logic |
| 5. States modeled as distinct types | PASS | FlowTrace, DomainVisualization discriminated unions |
| 6. Implicit concepts made explicit | PASS | Entry vs downstream steps, internal vs external domains |
| 7. Aggregates around invariants | PASS | GraphContext enforces valid-graph invariant at load |
| 8. Value objects extracted | PASS | LayoutPosition, DomainConnection, ComponentReference |

## Key Domain Concepts

### FlowTrace (Discriminated Union)

Represents a step in a flow through the architecture.

```typescript
type FlowTrace =
  | EntryStepFlowTrace
  | DownstreamFlowTrace

interface EntryStepFlowTrace {
  kind: 'entry'
  node: FlowStepNode
  depth: 0
}

interface DownstreamFlowTrace {
  kind: 'downstream'
  node: FlowStepNode
  connectionType: 'sync' | 'async'
  depth: number
  externalLinks: ExternalLink[]
}
```

### DomainVisualization (Discriminated Union)

Represents how a domain appears in the domain map.

```typescript
type DomainVisualization =
  | InternalDomainVisualization
  | ExternalDomainVisualization

interface InternalDomainVisualization {
  kind: 'internal'
  name: string
  componentCount: number
  emphasis: 'normal' | 'highlighted' | 'dimmed'
}

interface ExternalDomainVisualization {
  kind: 'external'
  name: string
  connectionCount: number
  emphasis: 'normal' | 'highlighted' | 'dimmed'
}
```

### DomainConnection (Value Object)

Represents a connection between domains in the architecture.

```typescript
class DomainConnection {
  constructor(
    readonly source: ComponentReference,
    readonly target: ComponentReference,
    readonly connectionType: ConnectionType
  ) {}

  isAsynchronous(): boolean
  isSynchronous(): boolean
  involvesExternalSystem(): boolean
}

class ComponentReference {
  constructor(
    readonly name: string,
    readonly nodeType: NodeType,
    readonly isExternal: boolean = false
  ) {}
}
```

### LayoutPosition (Value Object)

Represents a position in the graph layout.

```typescript
class LayoutPosition {
  constructor(
    readonly x: number,
    readonly y: number
  ) {}

  distanceTo(other: LayoutPosition): number
  equals(other: LayoutPosition): boolean
}
```

### ArchitectureMetrics (Value Object)

Summary metrics about the loaded architecture.

```typescript
interface ArchitectureMetrics {
  readonly totalComponents: number
  readonly totalDomains: number
  readonly totalApis: number
  readonly totalEntities: number
  readonly totalEvents: number
  readonly totalConnections: number
}
```

## Projection Functions

Each feature projects a specialized view from the loaded RiviereGraph:

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| projectFlowTraces | RiviereGraph | Flow[] | Entry points and their downstream paths |
| projectDomainConnections | RiviereGraph | DomainMapData | Inter-domain relationships for visualization |
| projectDomainInventory | RiviereGraph, DomainName | DomainDetails | Components within a specific domain |
| computeArchitectureMetrics | RiviereGraph | ArchitectureMetrics | Summary counts for dashboard |
| compareGraphs | RiviereGraph, RiviereGraph | GraphDiff | Differences between versions |

## Data Flow

```text
                                      +------------------+
                                      |    shell/App     |
                                      |  (routing/wiring)|
                                      +--------+---------+
                                               |
                                               v
                              +----------------+----------------+
                              |                                 |
                              v                                 v
                    +---------+----------+           +---------+---------+
                    | platform/domain/   |           | platform/infra/   |
                    | riviere/           |           | demo/             |
                    | GraphContext       |<--------->| useDemoMode       |
                    +--------------------+           +-------------------+
                              |
                              | provides RiviereGraph
                              v
         +--------------------+--------------------+
         |                    |                    |
         v                    v                    v
  +------+------+     +-------+-------+    +------+------+
  | features/   |     | features/     |    | features/   |
  | flows/      |     | domain-map/   |    | full-graph/ |
  | projectFlow |     | projectDomain |    | ForceGraph  |
  | Traces      |     | Connections   |    |             |
  +-------------+     +---------------+    +-------------+
```

## Priority Implementation Order

1. **High Priority**
   - R2: Split types/riviere.ts into cohesive modules
   - R1: Create platform/ folder structure
   - R5: Extract demo loading from GraphContext

2. **Medium Priority**
   - R3: Create shell/ folder
   - R4: Relocate shared UI components
   - R8: Rename extraction functions to projection functions
   - R11: Rename GraphStats to ArchitectureMetrics

3. **Lower Priority**
   - R6: Move test fixtures
   - R9: Model Flow states explicitly
   - R10: Extract DomainConnection value object
   - R12: Model DomainNode states
   - R13: Extract LayoutPosition value object
   - R14: Rename errors to use domain language

## Notes on React Adaptation

The separation-of-concerns pattern adapts to React as follows:

- **entrypoint/** becomes Page components that receive props and render
- **use-cases/** becomes the orchestration within Page components (useMemo + projection function + state hooks)
- **domain/** becomes projection functions and domain types within the feature

This adaptation preserves the core principle (thin entrypoints, orchestration separate from domain logic) while respecting React's component-based architecture.
