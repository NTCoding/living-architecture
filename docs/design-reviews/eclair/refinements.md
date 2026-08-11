# Refinements for eclair

Refinements based on separation-of-concerns and tactical-ddd skill principles.

## Separation of Concerns Refinements

### R1: Add platform/ folder for shared horizontals

**Checklist item:** 1, 2, 6

**Current state:** Shared code scattered across lib/, hooks/, contexts/, types/, components/.

**Refinement:** Create platform/ with domain/ and infra/ subfolders. Move shared business logic to platform/domain/ and technical utilities to platform/infra/.

**Specific moves:**
- `lib/graphStats.ts` -> `platform/domain/graph-analysis/computeGraphStats.ts`
- `lib/exportGraph.ts` -> `platform/infra/file-export/exportGraph.ts`
- `lib/handlePositioning.ts` -> `platform/domain/layout/handlePositioning.ts`
- `hooks/useRiviereQuery.ts` -> `platform/domain/riviere/useRiviereQuery.ts`
- `types/riviere.ts` -> split per R2

### R2: Split monolithic types/riviere.ts

**Checklist item:** 9, 13

**Current state:** 202-line file containing branded IDs, node types, edge types, graph types, source location types.

**Refinement:** Split into cohesive modules grouped by what changes together.

**Specific split:**
- `platform/domain/riviere/branded-ids.ts` - NodeId, EdgeId, DomainName, etc.
- `platform/domain/riviere/component-types.ts` - UINode, APINode, UseCaseNode, DomainOpNode, EventNode, EventHandlerNode, CustomNode
- `platform/domain/riviere/edge-types.ts` - Edge, EdgePayload, EdgeType, LinkType
- `platform/domain/riviere/external-types.ts` - ExternalTarget, ExternalLink
- `platform/domain/riviere/graph-types.ts` - RiviereGraph, GraphMetadata, DomainMetadata
- `platform/domain/riviere/source-location.ts` - SourceLocation, OperationSignature, OperationParameter, OperationBehavior
- `platform/domain/riviere/index.ts` - re-exports all

### R3: Add shell/ for wiring layer

**Checklist item:** 1, 4

**Current state:** App.tsx at root acts as wiring layer.

**Refinement:** Move App.tsx and layout components to shell/.

**Specific moves:**
- `App.tsx` -> `shell/App.tsx`
- `components/AppShell/` -> `shell/components/AppShell/`
- `components/Header/` -> `shell/components/Header/`
- `components/Sidebar/` -> `shell/components/Sidebar/`
- `components/Logo/` -> `shell/components/Logo/`

### R4: Relocate shared UI components to platform/

**Checklist item:** 6

**Current state:** Shared components like FileUpload, ThemeSwitcher, OrphanWarning, SchemaModal in components/.

**Refinement:** Move to platform/infra/ since they are technical UI utilities, not domain logic.

**Specific moves:**
- `components/FileUpload/` -> `platform/infra/file-handling/FileUpload/`
- `components/ThemeSwitcher/` -> `platform/infra/theming/ThemeSwitcher/`
- `components/OrphanWarning/` -> `platform/infra/warnings/OrphanWarning/`
- `components/SchemaModal/` -> `platform/infra/schema-viewer/SchemaModal/`

### R5: Extract demo loading from GraphContext

**Checklist item:** Principle 4 (separate functions with different state dependencies)

**Current state:** GraphContext.tsx handles graph state, demo mode detection, demo fetching, URL manipulation, localStorage writes.

**Refinement:** Split into focused modules.

**Specific split:**
- `platform/domain/riviere/GraphContext.tsx` - graph state only (setGraph, clearGraph, hasGraph, graphName)
- `platform/infra/demo/useDemoMode.ts` - demo detection and loading
- `platform/infra/settings/useCodeLinkSettings.ts` - code link settings management

### R6: Move test fixtures to test infrastructure

**Checklist item:** N/A (test infrastructure separation)

**Current state:** lib/riviereTestFixtures.ts in production source.

**Refinement:** Move to test infrastructure folder.

**Specific move:**
- `lib/riviereTestFixtures.ts` -> `__fixtures__/riviereTestFixtures.ts`

### R7: Rename pluralize.ts and relocate

**Checklist item:** 10 (file names relate to directory)

**Current state:** pluralize.ts in features/domain-map is a generic utility.

**Refinement:** If only used by domain-map, keep but rename to reflect domain-map context. If shared, move to platform.

**Decision:** Keep in domain-map since it only pluralizes domain-map specific labels.

## Tactical DDD Refinements

### R8: Introduce domain language for graph transformations

**Principle:** 2 (use rich domain language), 6 (make implicit explicit)

**Current state:** Functions named extractFlows, extractDomainMap, extractDomainDetails. Generic "extract" prefix.

**Refinement:** These transform a RiviereGraph into view-specific projections. Rename to reflect domain intent.

**Specific renames:**
- `extractFlows` -> `projectFlowTraces` - projecting the graph into traceable flows
- `extractDomainMap` -> `projectDomainConnections` - projecting inter-domain relationships
- `extractDomainDetails` -> `projectDomainInventory` - projecting domain's internal structure

### R9: Model Flow states explicitly

**Principle:** 6 (make implicit explicit), 8 (extract immutable value objects)

**Current state:** Flow has entryPoint and steps array. FlowStep has edgeType that can be null.

**Refinement:** The null edgeType represents the entry point step (first step in any flow). Make this explicit.

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

### R10: Extract DomainConnection value object

**Principle:** 8 (extract immutable value objects)

**Current state:** ConnectionDetail interface with sourceName, targetName, type, targetNodeType.

**Refinement:** This represents a connection between domains. Make it a proper value object with behavior.

```typescript
class DomainConnection {
  constructor(
    readonly source: ComponentReference,
    readonly target: ComponentReference,
    readonly connectionType: ConnectionType
  ) {}

  isAsynchronous(): boolean {
    return this.connectionType === 'async'
  }

  isSynchronous(): boolean {
    return this.connectionType === 'sync'
  }

  involvesExternalSystem(): boolean {
    return this.target.isExternal
  }
}

class ComponentReference {
  constructor(
    readonly name: string,
    readonly nodeType: NodeType,
    readonly isExternal: boolean = false
  ) {}
}
```

### R11: Rename GraphStats to ArchitectureMetrics

**Principle:** 2 (use rich domain language)

**Current state:** GraphStats with totalNodes, totalDomains, etc.

**Refinement:** These are metrics about the architecture, not generic graph statistics.

**Specific rename:**
- `GraphStats` -> `ArchitectureMetrics`
- `computeGraphStats` -> `computeArchitectureMetrics`

### R12: Model DomainNode states for visualization

**Principle:** 6 (make implicit explicit)

**Current state:** DomainNodeData has dimmed and isExternal booleans.

**Refinement:** These represent visual states. Make them explicit.

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

### R13: Extract LayoutPosition value object

**Principle:** 8 (extract immutable value objects)

**Current state:** Position represented as {x: number, y: number} inline objects.

**Refinement:** Extract to value object.

```typescript
class LayoutPosition {
  constructor(
    readonly x: number,
    readonly y: number
  ) {}

  distanceTo(other: LayoutPosition): number {
    const dx = this.x - other.x
    const dy = this.y - other.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  equals(other: LayoutPosition): boolean {
    return this.x === other.x && this.y === other.y
  }
}
```

### R14: Rename errors to use domain language

**Principle:** 2 (use rich domain language)

**Current state:** Generic error names like GraphError, RenderingError.

**Refinement:** More specific domain names.

**Specific renames:**
- `GraphError` -> `RiviereGraphError` (clarifies which graph type)
- `LayoutError` -> `DomainMapLayoutError` (clarifies layout context)
- `SchemaError` -> `RiviereSchemaError` (clarifies which schema)

### R15: Introduce ArchitectureViewer aggregate

**Principle:** 7 (design aggregates around invariants)

**Current state:** GraphContext manages graph state. Multiple features transform the graph independently.

**Observation:** The invariant is: "A loaded graph must be valid according to Riviere schema." This is enforced at load time via parseRiviereGraph. Once valid, features can project views freely.

**Refinement:** The current design is acceptable. GraphContext acts as the aggregate root for graph state. Features project read-only views. No cross-feature mutations occur.

**No change needed** - architecture correctly isolates the validation invariant at the load boundary.
