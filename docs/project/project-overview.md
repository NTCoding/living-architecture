# Living Architecture - Project Overview

## Vision

Generate interactive models of software architecture directly from code, enabling developers to understand and navigate complex distributed systems through flow-based visualization.

## Problem Statement

Modern distributed systems span multiple codebases, languages, and domains. Understanding how an operation flows through the system—from UI interaction through APIs, use cases, domain logic, databases, and events—is extremely difficult:

- **Static documentation** becomes outdated immediately
- **Dependency graphs** show technical connections, not operational flow
- **Manual diagramming** is time-consuming and error-prone
- **Cross-codebase tracing** requires deep tribal knowledge

## Solution

Living Architecture extracts flow-based architecture models directly from code and presents them as interactive, queryable graphs. Instead of showing technical dependencies, it traces how operations and data flow through the system.

**Example flow:**
```
UI /orders
  → API /bff/orders/place
  → API /orders-domain/place-order
  → Use Case: Place Order
  → Domain Operation: Order.begin()
  → Event: order-domain.order-placed
  → [ShippingDomain] Event Handler
  → Use Case: Prepare Shipping
  → Domain Operation: Shipping.create()
```

## Core Components

### 1. Rivière Schema
**Language-agnostic graph format**

- Nodes: Components (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)
- Edges: Flow relationships (sync calls, async events, data flow)
- Metadata: Domain boundaries, payloads, source locations
- Format: JSON Schema for validation, JSON for storage

### 2. Visualization UIs
**Interactive exploration**

- Node-edge graph visualization
- Flow tracing (follow an operation end-to-end)
- Domain filtering (show/hide domains)
- Search and query (find patterns, components)
- Multiple views for different use cases

### 3. Extraction Engines
**Code → Graph transformation**

- Parse source code to identify flow patterns
- Extract API endpoints, use case invocations, event publishing/handling
- Link flows across component boundaries
- Language-specific extractors (TypeScript first, extensible to Java, Python, Go, etc.)

### 4. Aggregation Layer
**Multi-codebase combining**

- Merge graphs from multiple repositories
- Resolve cross-domain flows (e.g., event publisher → handler)
- Handle polyglot systems (10 codebases in 10 languages)
- Maintain domain boundaries

## Project Phases

### Phase 1: Rivière Schema + Test Data
**Goal:** Define the foundational graph format and validate with realistic examples

- JSON Schema for nodes and edges
- Standard node types (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)
- Rich edge metadata (flow types, payloads, source locations)
- Real-world example graphs (order placement, cross-domain events, multi-service flows)
- Simple HTML visualizer to validate schema works

**Deliverable:** Working schema with test data viewable in browser

**Why first:** Defines the contract for everything else. Once schema is solid, UI and extraction can build independently.

### Phase 2: Interactive Visualization UI
**Goal:** Prove the value proposition with interactive graph exploration

- Professional graph rendering (React Flow, Cytoscape.js, or similar)
- Interactive features:
  - Flow tracing (click node, see full path)
  - Domain filtering (show/hide domains)
  - Search (find components, flows)
  - Layout algorithms (automatic organization)
- Use Phase 1 test data to develop features
- Multiple visualization modes (overview, detail, trace)

**Deliverable:** Production-quality UI that demonstrates the value of flow-based architecture visualization

**Why second:** Validates the entire concept. If the UI with test data isn't compelling, we pivot before building extraction.

### Phase 3: TypeScript Architecture Extractor
**Goal:** Automate graph generation from TypeScript codebases

**Note:** POC extraction already validates feasibility.

- **TypeScript extractor:**
  - Extract API endpoints (Express, Fastify, etc.)
  - Trace use case invocations
  - Detect event publishing/handling
  - Generate Rivière graphs with accurate sourceLocations
- **Multi-codebase aggregation:**
  - Merge graphs from multiple repos
  - Resolve cross-domain flows (event publishers → handlers)
  - Handle monorepos and multi-repo architectures
- **CLI tools:** Commands for extraction and aggregation workflows
- **Additional extractors** (Java, Python, Go) as future work

**Deliverable:** Automated extraction from TypeScript codebases → Rivière graphs → working visualizations

**Why last:** Most complex component. Building it last means schema and UI are validated and stable. POC proves it's achievable.

### Phase 4: Hardening & Polish
**Goal:** Make it ready for real-world use

- Performance optimization (large graphs)
- Error handling and validation
- Documentation and examples
- Integration with development workflows
- Versioning and graph evolution

**Deliverable:** Tool ready for use on production systems

## Technical Constraints

### Language Agnostic
The graph format must work for any programming language. Extractors are language-specific, but the Rivière schema is universal.

### Flow-Based, Not Dependency-Based
Focus on operational flow (how operations execute) rather than technical dependencies (what imports what).

### Flexible Node Types
While we define standard types (UI, API, UseCase, etc.), the system must support custom types for different architectural patterns.

### Decoupled Components
Schema, extraction, aggregation, and visualization are independent. You can:
- Use the schema without extraction (manual graph creation)
- Extract without visualization (programmatic analysis)
- Visualize without extraction (pre-built graphs)

## Success Metrics

### Phase 1 Success
- Can represent realistic multi-domain flows in Rivière format
- Schema validates correctly (catches invalid graphs)
- Example graphs render in simple visualizer
- TypeScript projects can consume schema with type safety

### Phase 2 Success
- UI is compelling and demonstrates clear value
- Non-technical stakeholders can understand system flows
- Developers can trace operations end-to-end visually
- Team validates this would help onboarding and debugging

### Phase 3 Success
- Can extract graphs from real codebases without manual work
- Cross-domain flows link correctly across repos
- Extraction is fast enough for regular use
- Graphs match reality (verified against actual code)

### Project Success
- New team members understand system flow in hours, not weeks
- Architecture documentation stays synchronized with code
- Cross-team dependencies are visible and traceable
- Debugging distributed flows becomes faster

## Related Documentation

- [Rivière Schema PRD](./riviere-schema.md) - Detailed plan for Phase 1
