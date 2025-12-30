# Quick Start

Build your first Riviere graph in 5 minutes.

**Schema version:** `v1.0`

## What you'll learn

- How to configure `RiviereBuilder` with sources and domains
- How to add components and link them into a flow
- How to build and export a schema-valid graph

## Installation

```bash
npm install @living-architecture/riviere-builder
```

## Basic Usage

```typescript
import { RiviereBuilder } from '@living-architecture/riviere-builder'

const builder = new RiviereBuilder({
  name: 'my-service',
  description: 'Order processing service',
  sources: [
    { repository: 'your-repo' }
  ],
  domains: {
    orders: {
      description: 'Order management',
      systemType: 'domain'
    }
  }
})

const api = builder.addApi({
  domain: 'orders',
  module: 'checkout',
  httpMethod: 'POST',
  path: '/orders',
  sourceLocation: {
    repository: 'your-repo',
    filePath: 'src/api/orders.ts',
    lineNumber: 42
  }
})

const useCase = builder.addUseCase({
  domain: 'orders',
  module: 'checkout',
  name: 'place-order',
  sourceLocation: {
    repository: 'your-repo',
    filePath: 'src/use-cases/place-order.ts',
    lineNumber: 10
  }
})

builder.link(api, useCase, 'sync')

const graph = builder.build()
console.log(JSON.stringify(graph, null, 2))
```

## Output

The `build()` method returns a valid Riviere graph:

```json
{
  "version": "1.0",
  "metadata": {
    "name": "my-service",
    "description": "Order processing service",
    "generated": "2024-01-15T10:30:00.000Z",
    "sources": [
      { "repository": "your-repo" }
    ],
    "domains": {
      "orders": {
        "description": "Order management",
        "systemType": "domain"
      }
    }
  },
  "components": [
    {
      "id": "orders:checkout:api:post/orders",
      "type": "API",
      "name": "POST /orders",
      "domain": "orders",
      "module": "checkout",
      "apiType": "REST",
      "httpMethod": "POST",
      "path": "/orders",
      "sourceLocation": {
        "repository": "your-repo",
        "filePath": "src/api/orders.ts",
        "lineNumber": 42
      }
    },
    {
      "id": "orders:checkout:usecase:placeorder",
      "type": "UseCase",
      "name": "place-order",
      "domain": "orders",
      "module": "checkout",
      "sourceLocation": {
        "repository": "your-repo",
        "filePath": "src/use-cases/place-order.ts",
        "lineNumber": 10
      }
    }
  ],
  "links": [
    {
      "id": "orders:checkout:api:post/orders→orders:checkout:usecase:placeorder:sync",
      "source": "orders:checkout:api:post/orders",
      "target": "orders:checkout:usecase:placeorder",
      "type": "sync"
    }
  ]
}
```

## Next Steps

- [AI Extraction](/extract/) — The 6-step extraction workflow
- [Graph Structure](/reference/schema/graph-structure) — Understand components, links, and domains
- [API Reference](/reference/api/) — Complete method documentation

## See Also

- [Library vs CLI](./library-vs-cli)
