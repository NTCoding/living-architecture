---
layout: home

hero:
  name: Rivière
  text: Living Architecture
  tagline: Extract flow-based architecture from code as living documentation
  image:
    src: /eclair-hero.png
    alt: Éclair architecture visualization
  actions:
    - theme: brand
      text: Get Started
      link: /get-started/
    - theme: alt
      text: View Demo
      link: /eclair/
    - theme: alt
      text: GitHub
      link: https://github.com/ntcoding/living-architecture

features:
  - title: Flow-Based, Not Dependency-Based
    details: Trace how operations execute through your system—from UI to API to domain logic to events—not just what imports what.
  - title: AI-Assisted Extraction
    details: AI analyzes your code and calls CLI commands. The CLI validates and catches mistakes. Together they extract accurate architecture.
  - title: Interactive Visualization
    details: Explore your architecture in Éclair. Filter by domain, trace flows, compare versions, and understand your system at any level.
  - title: 100% Open Source
    details: MIT licensed. Use it, fork it, contribute. Built in the open on GitHub.
---

## The Problem

Modern distributed systems span multiple codebases, languages, and domains. Understanding how an operation flows through the system is difficult:

- **Static documentation** becomes outdated immediately
- **Dependency graphs** show imports, not operational flow
- **Manual diagramming** is time-consuming and error-prone
- **Cross-codebase tracing** requires tribal knowledge

## The Solution

Rivière extracts **flow-based architecture** directly from code. Instead of showing technical dependencies, it traces how operations flow through your system.

```text
UI /orders
  → API /bff/orders/place
  → UseCase: Place Order
  → DomainOp: Order.begin()
  → Event: order-placed
  → EventHandler: Prepare Shipping
```

## Two Products

<div class="products">

### Rivière — Extract

CLI and libraries for extracting architecture from code. Works with AI assistants or programmatically.

**[Start Extracting →](/extract/)**

### Éclair — Visualize

Interactive web app for exploring architecture graphs. Multiple views for different questions.

**[Start Viewing →](/visualize/)**

</div>

## Choose Your Path

| I want to... | Go here |
|--------------|---------|
| Extract architecture from existing code | [AI Extraction Guide](/extract/) |
| Build graphs programmatically | [Library Quick Start](/get-started/quick-start) |
| View an architecture graph | [Éclair Guide](/visualize/) |
| Understand the schema format | [Schema Reference](/reference/schema/graph-structure) |

## Packages

| Package | Description |
|---------|-------------|
| `@living-architecture/riviere-cli` | CLI for AI-assisted extraction |
| `@living-architecture/riviere-builder` | Node.js library for building graphs |
| `@living-architecture/riviere-query` | Browser-safe library for querying graphs |
