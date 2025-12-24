---
layout: home

hero:
  name: Living Architecture
  text: Extract architecture from code
  tagline: AI-assisted extraction of flow-based architecture graphs from your codebase
  actions:
    - theme: brand
      text: Start AI Extraction
      link: /guide/ai-extraction
    - theme: alt
      text: Use Programmatic Library
      link: /guide/quick-start

features:
  - title: AI + CLI Workflow
    details: AI analyzes code and calls CLI commands. CLI validates and catches mistakes. Together they extract accurate architecture.
  - title: 6-Step Extraction
    details: Understand, Define, Extract, Link, Enrich, Validate. Each step builds on the previous.
  - title: Error Recovery
    details: When AI makes mistakes, CLI suggests corrections. Near-match suggestions enable self-correction.
  - title: Schema Compliant
    details: Output conforms to the Riviere JSON Schema. Visualize in Eclair.
---

## Get Started

**Schema version:** `v1.0`

- **[AI Extraction](/guide/ai-extraction)** - Extract architecture from existing code (recommended)
- **[Programmatic Library](/guide/quick-start)** - Build graphs in TypeScript code
- **[CLI Quick Start](/guide/cli-quick-start)** - Hands-on CLI tutorial

## What is Riviere?

Riviere is a JSON format for representing software architecture as **flow-based graphs**. Unlike dependency graphs that show imports, Riviere graphs show how operations flow through your system.

```text
UI -> API -> UseCase -> DomainOp -> Event -> EventHandler
```

## Packages

| Package | Description |
|---------|-------------|
| `@living-architecture/riviere-cli` | CLI tool for AI-assisted extraction |
| `@living-architecture/riviere-builder` | Node.js library for building graphs |
| `@living-architecture/riviere-query` | Browser-safe library for querying graphs |

See [the JSON Schema](/schema/riviere.schema.json) for the complete format specification.
