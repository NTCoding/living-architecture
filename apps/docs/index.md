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
      link: /eclair/?demo=true
    - theme: alt
      text: GitHub
      link: https://github.com/ntcoding/living-architecture

features:
  - title: Flow-Based, Not Dependency-Based
    details: Trace how operations execute through your system—from UI to API to domain logic to events—not just what imports what.
  - title: Flexible Extraction
    details: AI-assisted extraction works for any codebase. Config-based extraction provides speed and repeatability when you follow architectural conventions.
  - title: Interactive Visualization
    details: Explore your architecture in Éclair. Filter by domain, trace flows, compare versions, and understand your system at any level.
  - title: 100% Open Source
    details: Apache 2.0 licensed. Use it, fork it, contribute. Built in the open on GitHub.
---

## How It Works

<div class="workflow-diagram">
  <img src="/workflow-infographic.svg" alt="Workflow: Your Code → Extract → Rivière Schema → Visualize in Éclair">
</div>

<div class="products">

### Rivière Schema

A JSON format that captures how operations flow through your system — from UI to API to domain logic to events. Not just what imports what, but how things actually work.

**[Learn the Schema →](/reference/schema/graph-structure)**

### Rivière CLI

Point an AI assistant at your codebase. It calls CLI commands to analyze your code and build a Rivière schema.

**[CLI Guide →](/reference/cli/)**

### Rivière Builder

Build schemas programmatically in TypeScript. Integrate into build pipelines or create custom extraction tools.

**[Library Guide →](/get-started/quick-start)**

### Éclair

Load your schema into Éclair. Filter by domain, trace flows end-to-end, see which services publish and subscribe to events.

**[Explore the Demo →](/eclair/?demo=true)**

</div>

## Rivière Flow-Based Schema

Rivière extracts **flow-based architecture** directly from code. Instead of showing technical dependencies, it traces how operations flow through your system.

```text
UI /orders
  → API /bff/orders/place
  → UseCase: Place Order
  → DomainOp: Order.begin()
  → Event: order-placed
  → EventHandler: Prepare Shipping
```

## See It In Action

<div class="screenshots">
<figure>
  <img src="/eclair-flow.png" alt="Flow view showing an operational flow through multiple domains">
  <figcaption>Trace an operational flow end-to-end</figcaption>
</figure>
<figure>
  <img src="/eclair-domain-map.png" alt="Domain map showing dependencies between domains">
  <figcaption>Visualize domain dependencies</figcaption>
</figure>
</div>

## Run Locally

Clone the repo and run Éclair with the demo graph.

```bash
git clone https://github.com/NTCoding/living-architecture.git
cd living-architecture
pnpm install
pnpm nx serve eclair
```

Open `http://localhost:5173/eclair/`

## Choose Your Path

| I want to... | Go here |
|--------------|---------|
| Extract architecture from existing code | [AI Extraction Guide](/extract/) |
| Build graphs programmatically | [Library Quick Start](/get-started/quick-start) |
| View an architecture graph | [Éclair Guide](/visualize/) |
| Understand the schema format | [Schema Reference](/reference/schema/graph-structure) |
| Try it with a demo graph | [View Demo](/eclair/?demo=true) |
| Run Éclair locally | [Run Locally](/get-started/#run-locally) |

## Packages

| Package | Description |
|---------|-------------|
| `@living-architecture/riviere-cli` | CLI for extraction and graph building |
| `@living-architecture/riviere-builder` | Node.js library for building graphs |
| `@living-architecture/riviere-query` | Browser-safe library for querying graphs |
| `@living-architecture/riviere-extract-config` | Extraction config schema and validation |
| `@living-architecture/riviere-extract-conventions` | TypeScript decorators for component marking |
| `@living-architecture/riviere-extract-ts` | TypeScript component extractor |
