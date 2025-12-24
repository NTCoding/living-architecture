# Rivière

**Extract living architecture from code.**

Rivière generates flow-based architecture graphs from your codebase. See how operations flow through your system — from UI to API to domain logic to events — without manual diagramming.

## Why Rivière?

- **Static docs drift** — Written once, outdated forever
- **Dependency graphs mislead** — Show imports, not operational flow
- **Manual diagrams cost hours** — And drift from reality immediately
- **Cross-codebase understanding requires tribal knowledge** — Especially in distributed systems

Rivière extracts what actually happens when code runs.

## How It Works

```
UI /orders
  → API POST /orders
    → UseCase PlaceOrder
      → DomainOp Order.create()
        → Event order-placed
          → EventHandler NotifyShipping
```

Rivière models operational flow, not technical dependencies. Components have types that reflect their architectural role:

| Type | What It Represents |
|------|-------------------|
| **UI** | User-facing routes and screens |
| **API** | HTTP endpoints (REST, GraphQL) |
| **UseCase** | Application-level orchestration |
| **DomainOp** | Domain logic and entity operations |
| **Event** | Async events published |
| **EventHandler** | Event subscribers |

## Quick Start

```bash
npm install @living-architecture/riviere-cli
npx riviere init
```

See [`apps/docs/guide/extraction/`](./apps/docs/guide/extraction/) for AI-assisted extraction.

## Packages

| Package | Purpose | Install |
|---------|---------|---------|
| `@living-architecture/riviere-query` | Query and validate graphs. Browser-safe. | `npm i @living-architecture/riviere-query` |
| `@living-architecture/riviere-builder` | Build graphs programmatically. | `npm i @living-architecture/riviere-builder` |
| `@living-architecture/riviere-cli` | CLI for extraction workflows. | `npm i @living-architecture/riviere-cli` |

## Build a Graph

```typescript
import { RiviereBuilder } from '@living-architecture/riviere-builder';

const builder = RiviereBuilder.create({ name: 'order-system' });

const api = builder.addApi({
  name: 'place-order',
  domain: 'orders',
  module: 'checkout',
  httpMethod: 'POST',
  path: '/orders',
});

const useCase = builder.addUseCase({
  name: 'PlaceOrder',
  domain: 'orders',
  module: 'checkout',
});

builder.link(api, useCase, { type: 'sync' });

const graph = builder.build();
```

## Query a Graph

```typescript
import { RiviereQuery } from '@living-architecture/riviere-query';

const query = RiviereQuery.from(graph);

// Find all entry points
const entryPoints = query.entryPoints();

// Trace a flow from a component
const flow = query.traceForward('orders:checkout:api:place-order');

// Find cross-domain connections
const crossDomain = query.crossDomainLinks();

// Get components by type
const events = query.componentsByType('Event');
```

## The Schema

Rivière graphs are JSON documents conforming to the [Rivière Schema](./schema/riviere.schema.json).

```json
{
  "version": "1.0",
  "metadata": {
    "name": "order-system",
    "domains": {
      "orders": { "description": "Order management", "systemType": "domain" }
    }
  },
  "components": [...],
  "links": [...]
}
```

See [`schema/examples/`](./schema/examples/) for complete multi-domain examples.

## Visualize with Éclair

Open your graph in Éclair, the interactive visualizer:

- Trace flows end-to-end
- Filter by domain
- Search components
- Click through to source code

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
