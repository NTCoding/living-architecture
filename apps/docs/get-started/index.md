# Get Started with Rivière

Rivière provides tools for building and querying flow-based architecture graphs.

**Schema version:** `v1.0`

## What You'll Learn

- How Rivière represents operational flow across your system
- When to use AI extraction, the CLI, or the TypeScript library
- Where to go next for guides, concepts, CLI, and API reference

## Why Rivière?

Modern distributed systems are hard to understand. Code is scattered across services, events flow between domains, and tracing an operation from UI to database requires deep system familiarity.

**Rivière captures operational flow**—not just "what imports what" but "how does placing an order actually work?" From UI click through API, use case, domain logic, events, and handlers.

## What is the Output?

Rivière tools produce JSON conforming to the **Rivière JSON Schema**:

```text
/schema/riviere.schema.json
```

This schema defines:
- 7 component types: UI, API, UseCase, DomainOp, Event, EventHandler, Custom
- 2 link types: sync, async
- Metadata: domains, sources, entities with state machines

See [Resources](./resources) for example graphs and the visualizer.

## Two Paths to Build Graphs

### AI Extraction (Recommended)

Use AI + CLI to extract architecture from existing codebases. This is the primary workflow.

**[Start AI Extraction →](/extract/)**

### Programmatic Library

Build graphs programmatically in TypeScript. Use when building custom extraction tools or integrating into build pipelines.

**[Start with the Library →](./quick-start)**

See [Library vs CLI](./library-vs-cli) for help choosing.

## Why Use the Libraries?

The schema has conventions for IDs, required fields per node type, and validation rules. The libraries:

- **Guide you** — Type-specific methods surface required and optional fields
- **Catch errors early** — Invalid configurations fail with helpful messages
- **Generate IDs automatically** — Following the schema convention
- **Validate at build time** — Ensuring your graph is well-formed
- **Query and analyze** — Find components, trace domains, identify entry points

## Next Steps

- **[AI Extraction](/extract/)** — Extract architecture from code (recommended)
- [CLI Quick Start](./cli-quick-start) — Build your first graph with CLI
- [Library Quick Start](./quick-start) — Build graphs programmatically
- [Core Concepts](/reference/schema/graph-structure) — Components, links, domains explained
- [CLI Reference](/reference/cli/) — Command documentation
- [API Reference](/reference/api/) — RiviereBuilder and RiviereQuery documentation

## See Also

- [Resources](./resources)
- [Library vs CLI](./library-vs-cli)
