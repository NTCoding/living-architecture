# Domain Detail

The Domain Detail page provides a comprehensive view of a single domain (bounded context).

[Screenshot: Domain Detail page with graph and details tabs]

## Navigating Here

Access a domain's detail page by:

- Clicking a domain name in the [Overview](./overview)
- Clicking a domain node in the [Domain Map](./domain-map)
- Selecting a domain from the sidebar

## View Modes

Toggle between two views:

### Graph View

[Screenshot: Domain context graph]

Shows this domain's context graph:

- The selected domain in the center
- Connected domains around it
- Cross-domain connections visible

This answers: "Who does this domain talk to?"

### Details View

[Screenshot: Domain details with component breakdown]

Shows comprehensive domain contents:

## Components by Type

Lists all components grouped by type:

| Type | Description |
|------|-------------|
| UI | User interface entry points |
| API | External API endpoints |
| UseCase | Application-layer operations |
| DomainOp | Domain-layer operations |
| EventHandler | Event subscribers |
| Custom | Application-specific components |

Each component shows:
- Name
- Description
- Link to view on Full Graph

[Screenshot: Component list with type grouping]

## Entities

All domain entities with:

- Entity name
- Description
- Invariants (business rules)

Same information as the [Entities](./entities) view, filtered to this domain.

## Events

Events published by this domain:

- Event name
- Description
- Payload schema
- Handlers in other domains

Shows what this domain "broadcasts" to others.

## Domain Metadata

At the top of the page:

- Domain name
- Description
- System type (Domain, UI, BFF)
- Total node count

## Search and Filter

Within the Details view:

- **Search** — Filter components by name
- **Type filter** — Show specific component types

## Next Steps

- [Domain Map](./domain-map) — See this domain in context
- [Flows](./flows) — Trace execution through this domain
