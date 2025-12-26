# Navigation

Common controls for navigating Éclair.

## Sidebar

The left sidebar provides access to all views:

[Screenshot: Expanded sidebar showing all navigation options]

| View | Purpose |
|------|---------|
| Overview | Dashboard with stats and domain list |
| Full Graph | Force-directed visualization of all nodes |
| Domain Map | High-level domain relationships |
| Flows | Entry points and execution traces |
| Entities | Domain entity browser |
| Events | Event catalog with publishers and handlers |
| Compare | Version comparison tool |

Click a domain name anywhere in the app to open its [Domain Detail](./views/domain-detail) page.

## Graph Controls

In graph views (Full Graph, Domain Map):

| Action | Control |
|--------|---------|
| Pan | Click and drag on empty space |
| Zoom | Mouse wheel or pinch gesture |
| Select node | Click on a node |
| Deselect | Click on empty space |
| Focus | Double-click a node to isolate its connections |

## Search

The search bar appears in most views. Type to filter by:

- Component name
- Domain name
- Node type

[Screenshot: Search bar with example query and filtered results]

## Filters

Many views provide filter panels to narrow what's displayed:

- **Type filters** — Show/hide by node type (UI, API, Entity, etc.)
- **Domain filters** — Show/hide by domain

[Screenshot: Filter panel showing type and domain checkboxes]

## Theme

Toggle between light and dark mode using the theme button in the sidebar footer.

[Screenshot: Theme toggle button]

## Export

Export visualizations as images:

1. Open the header menu
2. Select **Export as PNG** or **Export as SVG**

[Screenshot: Export menu options]

## Next Steps

- [Overview](./views/overview) — Start with the dashboard
- [Full Graph](./views/full-graph) — Explore the main visualization
