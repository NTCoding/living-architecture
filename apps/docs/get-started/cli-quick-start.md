# CLI Quick Start

Build your first Riviere graph using CLI commands in 5 minutes.

**Schema version:** `v1.0`

## What you'll learn

- How to create a graph, add components, link them, and validate the result
- Where the CLI stores the graph on disk
- Which commands to run next to enrich and inspect your graph

## Prerequisites

```bash
npm install @living-architecture/riviere-cli
```

## Step 1: Initialize Graph

Create a new graph with a name:

```bash
riviere builder init --name "my-service"
```

**Output:** Creates `.riviere/my-service.json`

## Step 2: Add Source and Domain

Register your repository and define a domain:

```bash
riviere builder add-source --repository "my-repo" --commit "abc123"

riviere builder add-domain --name "orders" --type "domain" --description "Order management"
```

## Step 3: Add Components

Add an API endpoint and a use case:

```bash
# API endpoint
riviere builder add-component --type API --domain orders --module api \
  --http-method POST --path /orders \
  --repository my-repo --source-file src/api/orders.ts --source-line 42

# Use case
riviere builder add-component --type UseCase --domain orders --module checkout \
  --name "place-order" \
  --repository my-repo --source-file src/usecases/place-order.ts --source-line 10
```

**Output:**
```text
Added API: orders:api:api:post/orders
Added UseCase: orders:checkout:usecase:placeorder
```

## Step 4: Link Components

Connect the API to the use case:

```bash
riviere builder link \
  --from "orders:api:api:post/orders" \
  --to-type UseCase --to-domain orders --to-name "place-order" \
  --type sync
```

**Output:**
```text
Linked: orders:api:api:post/orders → orders:checkout:usecase:placeorder (sync)
```

## Step 5: Validate

Check consistency and validate the graph:

```bash
riviere builder check-consistency
riviere builder validate
```

**Output:**
```text
Status: CONSISTENT
Components: 2
  By type: API=1, UseCase=1
  By domain: orders=2
Links: 1 (1 sync, 0 async)

Valid: Graph conforms to Riviere schema
```

## Result

Your graph is saved at `.riviere/my-service.json`:

```json
{
  "version": "1.0",
  "metadata": {
    "name": "my-service",
    "domains": {
      "orders": {
        "description": "Order management",
        "systemType": "domain"
      }
    },
    "sources": [
      { "repository": "my-repo", "commit": "abc123" }
    ]
  },
  "components": [
    {
      "id": "orders:api:api:post/orders",
      "type": "API",
      "domain": "orders",
      "module": "api",
      "httpMethod": "POST",
      "path": "/orders",
      "sourceLocation": {
        "repository": "my-repo",
        "filePath": "src/api/orders.ts",
        "lineNumber": 42
      }
    },
    {
      "id": "orders:checkout:usecase:placeorder",
      "type": "UseCase",
      "domain": "orders",
      "module": "checkout",
      "name": "place-order",
      "sourceLocation": {
        "repository": "my-repo",
        "filePath": "src/usecases/place-order.ts",
        "lineNumber": 10
      }
    }
  ],
  "links": [
    {
      "id": "orders:api:api:post/orders→orders:checkout:usecase:placeorder:sync",
      "source": "orders:api:api:post/orders",
      "target": "orders:checkout:usecase:placeorder",
      "type": "sync"
    }
  ]
}
```

## Next Steps

- [AI Extraction](/extract/) — The complete 6-step AI + CLI workflow
- [CLI Reference](/reference/cli/cli-reference) — All commands with examples
- [Graph Structure](/reference/schema/graph-structure) — Understand components and links

## See Also

- [CLI section](/reference/cli/)
