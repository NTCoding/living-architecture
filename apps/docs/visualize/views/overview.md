# Overview

The Overview is Éclair's home page—a dashboard showing architecture statistics and domain breakdown.

[Screenshot: Overview page with stats cards and domain grid]

## Statistics Cards

The top row displays aggregate counts:

| Stat | Description |
|------|-------------|
| Nodes | Total components in the graph |
| Domains | Number of bounded contexts |
| APIs | External API entry points |
| Entities | Domain entities |
| Events | Published domain events |

## Domain List

The main area shows all domains as cards. Each card displays:

- Domain name and description
- System type (Domain, UI, BFF)
- Node count by type
- Entity count
- Entry point count
- Repository link (if available)

[Screenshot: Single domain card with node breakdown]

## Filtering and Search

- **Search bar** — Filter domains by name
- **System type filter** — Show only Domain, UI, or BFF systems
- **View toggle** — Switch between grid and list layout

## Domain Actions

Each domain card provides:

- **View Details** — Open the [Domain Detail](./domain-detail) page
- **View on Map** — Jump to this domain in the [Domain Map](./domain-map)

## Next Steps

- [Domain Detail](./domain-detail) — Explore a single domain
- [Full Graph](./full-graph) — See all components visualized
