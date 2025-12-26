# Domain Map

The Domain Map shows high-level relationships between domains (bounded contexts).

[Screenshot: Domain Map with domains as large nodes and connection lines between them]

## What It Shows

Each node represents a domain. Edges show cross-domain connections:

- **API calls** — One domain invokes another's API
- **Events** — One domain publishes events another handles

This view answers: "Which domains talk to each other, and how?"

## Layout

Domains are arranged in a hierarchical layout showing:

- Entry point domains at the top
- Infrastructure domains at the bottom
- Related domains clustered together

## Connection Inspector

Click an edge to open the Connection Inspector panel on the right:

[Screenshot: Connection Inspector showing source, target, and connection list]

The inspector shows:

| Field | Description |
|-------|-------------|
| Source | Domain where the connection originates |
| Target | Domain receiving the call or event |
| Direction | Visual arrow showing flow direction |
| Connections | List of individual API/Event connections |
| Component counts | Number of nodes in each domain |

Each connection in the list shows:
- Connection type (API or Event)
- Component name
- Click to view on Full Graph

## Focus Mode

Click a domain node to enter focus mode:

- Selected domain highlights
- Connected domains remain visible
- Unconnected domains fade

Click empty space to exit focus mode.

## Node Tooltips

Hover over a domain to see:

- Domain name
- Total node count
- Quick stats

[Screenshot: Domain tooltip]

## Navigation

Click a domain node to navigate to its [Domain Detail](./domain-detail) page.

## Export

Export the Domain Map visualization as PNG or SVG from the header menu.

## Next Steps

- [Domain Detail](./domain-detail) — Drill into a specific domain
- [Flows](./flows) — See execution traces across domains
