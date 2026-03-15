# Graph Tab Plan - Architecture Evolution

## Overview

Add a second visualization mode ("Graph Tab") to the Architecture Evolution page that shows the full detailed graph with connections between individual API endpoints, grouped by domain containers.

## Context

- **Existing implementation**: Architecture Evolution page uses ReactFlow with service-level nodes (Services A, B, C, databases, Website, Mobile)
- **Full Graph reference**: `apps/eclair/src/features/full-graph/` uses ForceGraph with domain filtering and path highlighting
- **Shared state**: Both tabs share `stepIndex` (current commit) - switching tabs keeps the same position in the evolution timeline

## Goal

Create a proof-of-concept tab option that coexists with the existing domain-map view. Users can switch between:

- **Domain Map** - Higher-level view showing service-to-service relationships (current implementation)
- **Graph Tab** - Full detailed graph showing API endpoint-to-endpoint connections (new)

## Key Requirements

### 1. Domain Grouping

- Each service (A, B, C) is its own domain
- All nodes belonging to Service A should be visually contained within a Domain A container
- Domain containers create visual boundaries and spatial organization
- Uses ForceGraph's domain filtering and container visualization

### 2. Full Detailed Graph

- Shows ALL low-level connections, not just service-to-service
- Connections go between specific API endpoints (e.g., `place-order-api` in Service A → `order-placed-event` in Service B)
- Not meant for single-screen viewing - users navigate/pan/zoom the map

### 3. Preserve Existing Features

- Highlighting a node shows the full flow (path highlighting via ForceGraph's `highlightedNodeIds`)
- Same navigation controls at top (step forward/backward)
- Commit metadata display - same `ArchitectureEvolutionView` from shared data model

### 4. Visual Emphasis on Changes

- Different visual layout from domain map to emphasize what changes at each step
- Domain containers provide structural grouping that makes evolution changes visually apparent

## Technical Approach

### Domain Grouping

Use **forceInABox** D3 plugin:

- Integrates with existing D3 force simulation
- Each domain (service) gets its own bounding box region
- Nodes stay constrained within their group's area
- No custom calculations - proven library

### Shared State

- Current `stepIndex` state lives in `ArchitectureEvolutionPage.tsx`
- Both Domain Map and Graph components receive the same `stepIndex` and compute their own view
- Commit list and step metadata are shared via `architecture-evolution-scenario.ts`

### Decoupled Implementation

- New component: `GraphTabView.tsx` - wraps ForceGraph with evolution-specific behavior
- Reuses existing ForceGraph from `@/platform/infra/graph/ForceGraph/ForceGraph`
- Reuses existing domain filtering from full-graph feature
- New data adapter: transforms step-specific node/edge data into ForceGraph format

### Data Model Requirements

The Graph tab requires endpoint-level topology data separate from service-level:

- Each service has multiple API endpoints as nodes
- Edges connect specific endpoints, not services
- Each endpoint belongs to a domain (the parent service)

## UX Concept

### Tab Switching

- Two tabs in top-right of evolution page header:
  - "Domain Map" (current implementation)
  - "Graph" (new)

### Graph Layout (ForceGraph)

- Domain containers as the top-level organizational unit (Service A, Service B, Service C)
- API endpoints placed within their domain container
- Edges showing endpoint-to-endpoint connections
- Uses ForceGraph's `focusedDomain` prop for container visualization

### Navigation

- Same previous/next controls as domain map mode
- Stepping updates visual state via node/edge opacity and highlighting
- Viewport stays stable across steps (no `fitView` on step change)

### Visual States

- added: full opacity, highlighted
- changed: accent highlight
- removed: ghosted (low opacity ~0.24), muted edges, non-interactive
- unchanged: reduced opacity (~0.34)

## Implementation Plan

### Phase 1: Data Model

1. Define endpoint-level topology for the hard-coded scenario
2. Create adapter to transform step data into ForceGraph format

### Phase 2: Component Development

1. Create `GraphTabView` component wrapping ForceGraph
2. Add domain container visualization
3. Implement step-synchronized visual states

### Phase 3: Integration

1. Add tab toggle to `ArchitectureEvolutionPage` header
2. Conditionally render Domain Map vs Graph tab
3. Ensure stepIndex is shared between views

## Open Questions

### 1. Container Layout Options

- Should user be able to choose between fixed positions and force-directed layout?
- This was flagged as "make that an option user can choose" - implement as dropdown?

### 2. Endpoint Granularity for MVP

- Current node capabilities: should Graph tab render these as individual nodes?
- Or create a separate endpoint-level topology for the proof-of-concept?
