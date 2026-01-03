# Library vs CLI

Riviere offers two paths for building architecture graphs. Choose based on your use case.

## What you'll learn

- When the CLI is the best fit (AI-assisted extraction, deterministic validation)
- When the TypeScript library is the best fit (custom extraction, pipeline integration)
- Which docs to read next for each path

## Quick Decision

| Use Case | Path |
|----------|------|
| AI-assisted extraction from code | **CLI** |
| Custom extraction logic | **Library** |
| Shell-based automation | **CLI** |
| Programmatic control in code | **Library** |
| Validate AI-generated components | **CLI** |
| Embed in build pipeline | **Library** |

## CLI Path

The CLI is designed for **AI-assisted extraction workflows**. AI analyzes code and calls CLI commands to build the graph.

**Best for:**
- Extracting architecture from existing codebases
- AI agents that need deterministic validation
- Interactive, step-by-step graph building
- Error recovery with near-match suggestions

**How it works:**
1. AI analyzes codebase structure and patterns
2. AI calls CLI commands to add components and links
3. CLI validates each operation and provides feedback
4. AI self-corrects based on CLI error messages

```bash
riviere builder init --name "my-service"
riviere builder add-domain --name "orders" --type "domain" --description "Order management"
riviere builder add-component --type API --domain orders --module api \
  --http-method POST --path /orders \
  --repository my-repo --source-file src/api/orders.ts --source-line 10
```

**Start here:** [CLI Quick Start](./cli-quick-start)

## Library Path

The Library provides **programmatic control** for building graphs in TypeScript code.

**Best for:**
- Custom extraction tools
- Build pipeline integration
- Automated graph generation
- Testing and validation tooling

**How it works:**
1. Import the RiviereBuilder class
2. Configure metadata (sources, domains)
3. Add components programmatically
4. Link components and enrich with metadata
5. Validate and export the graph

```typescript
import { RiviereBuilder } from '@living-architecture/riviere-builder'

const builder = new RiviereBuilder({
  name: 'my-service',
  domains: { orders: { description: 'Order management', systemType: 'domain' } },
  sources: [{ repository: 'my-repo' }]
})

const api = builder.addApi({
  domain: 'orders',
  module: 'api',
  httpMethod: 'POST',
  path: '/orders',
  sourceLocation: { repository: 'my-repo', filePath: 'src/api/orders.ts', lineNumber: 10 }
})

const graph = builder.build()
```

**Start here:** [Library Quick Start](./quick-start)

## Both Paths, Same Output

Library and CLI produce identical, schema-compliant Riviere graphs. Choose based on workflow, not output format.

## Shared Concepts

Both paths use the same underlying concepts:

- [Graph Structure](/reference/schema/graph-structure) — Components, links, domains
- [ID Generation](/reference/api/id-generation) — Deterministic component IDs
- [Validation Rules](/reference/api/validation-rules) — What gets validated and when
- [Error Messages](/reference/api/error-messages) — Understanding and fixing errors

## See Also

- [CLI reference](/reference/cli/cli-reference)
- [API reference](/reference/api/)
