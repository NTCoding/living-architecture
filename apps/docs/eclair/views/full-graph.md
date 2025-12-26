# Full Graph

The Full Graph view displays all components as a force-directed network visualization.

[Screenshot: Full graph view with nodes clustered by domain]

## Graph Layout

Nodes are positioned using a force-directed algorithm that:

- Clusters related nodes together
- Separates unrelated nodes
- Shows connection patterns visually

Edges represent relationships:
- **Invokes** — One component calls another
- **Publishes** — An event is published to handlers

## Node Types

Nodes are color-coded by type:

| Type | Description |
|------|-------------|
| UI | User interface entry points |
| API | External API endpoints |
| UseCase | Application-layer operations |
| DomainOp | Domain-layer operations |
| Entity | Domain entities |
| Event | Published domain events |
| EventHandler | Event subscribers |
| Custom | Application-specific components |

## Interacting with Nodes

| Action | Result |
|--------|--------|
| Hover | Tooltip shows node details |
| Click | Selects node, highlights connections |
| Double-click | Focus mode—isolates this node's connections |

[Screenshot: Tooltip showing node name, type, domain, and description]

## Floating Panels

### Stats Panel

Shows aggregate counts for the current view:

[Screenshot: Stats panel showing nodes, edges, domains]

### Filter Panel

Filter what's displayed:

- **Node types** — Toggle visibility by type
- **Domains** — Show/hide specific domains
- **Show all / Hide all** — Quick toggles

[Screenshot: Filter panel with checkboxes]

### Search

Type to filter nodes by name, domain, or type. Matching nodes highlight in the graph.

## Orphan Nodes

Nodes with no connections (orphans) are automatically hidden. This keeps the graph focused on actual relationships.

## Export

Export the current visualization:

1. Open header menu
2. Select **Export as PNG** or **Export as SVG**

## Next Steps

- [Domain Map](./domain-map) — See high-level domain relationships
- [Flows](./flows) — Trace execution paths
