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
```text
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

## Technical Constraints

### Language Agnostic
The graph format must work for any programming language. Extractors are language-specific, but the Rivière schema is universal.

### Flow-Based, Not Dependency-Based
Focus on operational flow (how operations execute) rather than technical dependencies (what imports what).

**Key principle: Non-components are transparent.**

When tracing flows, we trace through ALL code but only show **components** in the final graph. Non-component classes (repositories, services, utilities) are invisible — we trace through them to find component-to-component connections.

```text
Code call chain:     UseCase → Repository → Order.begin()
                               (not a component)

Graph shows:         UseCase → Order
```

This means extraction must build a complete call graph, then filter to component-to-component edges. The flow exists through the repository, but the repository itself is not architecturally significant unless explicitly marked as a Custom component type.

### Flexible Node Types
While we define standard types (UI, API, UseCase, etc.), the system must support custom types for different architectural patterns.

### Decoupled Components
Schema, extraction, aggregation, and visualization are independent. You can:
- Use the schema without extraction (manual graph creation)
- Extract without visualization (programmatic analysis)
- Visualize without extraction (pre-built graphs)
