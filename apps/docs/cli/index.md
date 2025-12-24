# CLI Reference

Build Riviere architecture graphs from the command line.

The CLI is designed for AI-assisted extraction workflows—deterministic IDs, immediate validation feedback, and near-match suggestions when components aren't found.

## Graph Initialization

| Command | Purpose |
|---------|---------|
| [`new-graph`](./cli-reference#new-graph) | Initialize a new graph |
| [`add-source`](./cli-reference#add-source) | Register a source repository |
| [`add-domain`](./cli-reference#add-domain) | Add a domain |

## Component Management

| Command | Purpose |
|---------|---------|
| [`add-component`](./cli-reference#add-component) | Add a component (UI, API, UseCase, DomainOp, Event, EventHandler, Custom) |

## Linking

| Command | Purpose |
|---------|---------|
| [`link`](./cli-reference#link) | Link two components |
| [`link-http`](./cli-reference#link-http) | Link to API by HTTP method + path |
| [`link-external`](./cli-reference#link-external) | Link to external system |

## Enrichment

| Command | Purpose |
|---------|---------|
| [`enrich`](./cli-reference#enrich) | Add state changes and business rules to DomainOp |

## Validation

| Command | Purpose |
|---------|---------|
| [`check-consistency`](./cli-reference#check-consistency) | Check for errors and warnings |
| [`validate`](./cli-reference#validate) | Validate against JSON Schema |

## Discovery

| Command | Purpose |
|---------|---------|
| [`component-checklist`](./cli-reference#component-checklist) | Generate component checklist |
| [`component-summary`](./cli-reference#component-summary) | Generate component summary |

---

## Getting Started

- [CLI Quick Start](/guide/cli-quick-start) — Build your first graph
- [AI Extraction](/guide/ai-extraction) — The 6-step AI + CLI workflow
