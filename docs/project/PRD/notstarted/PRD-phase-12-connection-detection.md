# PRD: Phase 12 — Connection Detection

**Status:** Planning

**Depends on:** Phase 11 (Metadata Extraction)

---

## 1. Problem

Components are identified (Phase 10) and enriched with metadata (Phase 11). Now we need to detect **connections** — the links between components that represent operational flow.

**Connection types:**
- **Sync calls**: API → UseCase → DomainOp (method invocations)
- **Async events**: Component publishes event, EventHandler subscribes

**Key principle: Non-components are transparent.**

When tracing flows, we trace through ALL code but only show components in the graph. Non-component classes (repositories, services, utilities) are invisible — we trace through them.

```text
Code call chain:     UseCase → Repository → Order.begin()
                               (not a component)

Graph shows:         UseCase → Order
```

This means we must build a complete call graph, then filter to component-to-component edges.

**The core challenge:** JavaScript/TypeScript's dynamism makes call graph extraction inherently difficult. Academic research shows even best-in-class tools achieve ~91% recall — meaning they miss ~9% of real connections.

**Our insight:** If you **design code for extraction**, extraction becomes tractable. Codebases following our conventions can achieve 100% accurate extraction. Codebases that don't can still extract connections with lower confidence via configurable patterns or AI assistance.

---

## 2. Design Principles

### 2.1 Design for Extraction

**The fundamental principle:** Static analysis difficulty is a function of code design, not tooling sophistication.

| Hard to Analyze | Easy to Analyze |
|-----------------|-----------------|
| Runtime DI containers | Constructor injection with explicit types |
| Dynamic event names | String literal event names |
| `service.invoke(methodName)` | `service.specificMethod()` |
| Scattered dependencies | Explicit dependency declarations |
| Implicit conventions | Enforced conventions with decorators/interfaces |

**We promote the "easy to analyze" patterns as THE standard.** Teams that follow our conventions get 100% accurate extraction. We provide tooling that makes this the path of least resistance.

### 2.2 Two-Layer Extraction

Different codebases have different needs. We provide two layers:

| Layer | Accuracy | Performance | Use Case |
|-------|----------|-------------|----------|
| **Golden Path** | 100% | Fast | Teams using our conventions |
| **Configurable** | ~95% | Medium | Teams with existing patterns |

**Layer selection is per-extraction, not per-codebase.** A team might use Golden Path for their new code while using Configurable for modules with different conventions.

AI-assisted extraction already exists as a separate capability. Phase 12 focuses on deterministic extraction.

### 2.3 Fail Fast, Be Explicit

When Golden Path extraction cannot determine a connection with certainty:
- **Default:** Fail with clear error message
- **Lenient mode:** Mark as uncertain with confidence score

Users should know exactly what was extracted and what wasn't. No silent failures.

### 2.4 Connections Have Source Locations

Every detected connection should reference where in the code it was detected. This enables:
- Clicking through from visualization to code
- Validating extraction correctness
- Understanding why a connection was detected

---

## 3. What We're Building

### 3.1 Golden Path — Convention-Based Extraction

**Pattern: Constructor Injection**

```typescript
// Connections detected via constructor parameter types
class PlaceOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,  // → link to OrderRepository
    private eventBus: EventBus           // → (handled separately)
  ) {}
}
```

Config declares which types are components:
```yaml
connections:
  constructorInjection:
    componentTypes:
      - OrderRepository
      - PaymentService
      - InventoryService
```

**Pattern: Explicit Event Publishing**

```typescript
// Connection detected via typed publish method signature
class OrderPublisher {
  publishOrderPlaced(event: OrderPlacedEvent): void {
    this.eventBus.publish(event);
  }
}
```

The extractor identifies methods whose parameter types are known Event components.

**Pattern: Event Handler Subscription**

```typescript
// Connection detected via subscribedEvents metadata (from Phase 11)
class OrderPlacedHandler implements EventHandlerDef {
  static readonly subscribedEvents = ['OrderPlaced'] as const;
}
```

EventHandler → Event connection derived from `subscribedEvents` metadata.

**Pattern: Direct Method Calls on Components**

```typescript
// Connection detected when calling methods on component instances
const result = await this.orderRepository.save(order);
```

If `orderRepository` is typed as a component, the call creates a link.

### 3.2 Configurable — Pattern Matching Extraction

For teams with existing conventions that differ from Golden Path.

**Config DSL for connection patterns:**

```yaml
connections:
  patterns:
    - name: nestjs-controller-to-service
      find: methodCalls
      where:
        callerHasDecorator: [Controller]
        calleeType: { hasDecorator: Injectable }
      linkType: sync

    - name: custom-event-emitter
      find: methodCalls
      where:
        methodName: emit
        receiverType: CustomEventEmitter
      extract:
        eventName: { fromArgument: 0 }
      linkType: async
```

**Extraction rules (extending Phase 11 patterns):**
- `fromArgument: N` — Extract from method argument
- `fromReceiverType` — Extract from the object being called
- `fromCallerType` — Extract from the calling class

### 3.3 Connection Output Format

Connections map directly to Riviere schema `links`:

```json
{
  "links": [
    {
      "source": "orders:api:PlaceOrderController",
      "target": "orders:usecase:PlaceOrderUseCase",
      "type": "sync",
      "sourceLocation": {
        "repository": "ecommerce-demo-app",
        "filePath": "orders-domain/src/api/place-order/endpoint.ts",
        "lineNumber": 15,
        "methodName": "handle"
      }
    },
    {
      "source": "orders:usecase:PlaceOrderUseCase",
      "target": "orders:event:OrderPlaced",
      "type": "async",
      "sourceLocation": {
        "repository": "ecommerce-demo-app",
        "filePath": "orders-domain/src/api/place-order/use-cases/place-order-use-case.ts",
        "lineNumber": 42
      }
    }
  ]
}
```

### 3.4 CLI Interface

```bash
# Default: Golden Path only, strict mode
riviere extract --config ./config.yaml

# With configurable patterns
riviere extract --config ./config.yaml --patterns

# Show connection statistics
riviere extract --config ./config.yaml --stats

# Dry run: show what would be extracted
riviere extract --config ./config.yaml --dry-run
```

### 3.5 Performance Characteristics

| Layer | Expected Performance | Memory | Notes |
|-------|---------------------|--------|-------|
| Golden Path | TBD | TBD | Call graph tracing + filtering |
| Configurable | TBD | TBD | Custom pattern matching |

Performance benchmarks against ecommerce-demo-app required. Duration must be highly visible in CLI output.

### 3.6 "Design for Extraction" Documentation

Comprehensive guide covering:
- Why code design affects extraction accuracy
- Golden Path conventions with examples
- Migration guide from legacy patterns
- Enforcement setup (ESLint rules, ArchUnitTS)

Location: `docs/guides/design-for-extraction.md`

---

## 4. What We're NOT Building

| Exclusion | Rationale |
|-----------|-----------|
| **Cross-repo linking** | Phase 14 scope |
| **Extraction workflows/orchestration** | Phase 13 scope |
| **External tool integrations** (EventCatalog, etc.) | Phase 13 scope — workflows will orchestrate integrations |
| **Runtime tracing** | Static analysis only |
| **Full call graph** | We detect component-to-component, not all method calls |
| **HTTP client detection** | Deferred — complex, cross-repo implications |

---

## 5. Success Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Golden Path extracts sync connections (constructor injection, method calls) | Unit tests with 100% coverage |
| 2 | Golden Path extracts async connections (typed publish methods) | Unit tests with 100% coverage |
| 3 | Call graph traces through non-components correctly | Integration tests against demo app |
| 4 | Configurable layer supports custom patterns via DSL | Config validation + extraction tests |
| 5 | ecommerce-demo-app achieves 100% connection extraction | Full graph matches expected connections |
| 6 | Performance benchmarks documented | Each layer benchmarked against demo app |
| 7 | "Design for Extraction" guide published | Doc exists with all sections complete |
| 8 | Connection DSL documented | Reference docs with examples |

---

## 6. Open Questions

1. **Transitive connections** — ✅ RESOLVED
   - Trace through non-components to find component-to-component flows
   - `UseCase → Repo → Order` shows as `UseCase → Order`

2. **Event publishing pattern** — ✅ RESOLVED
   - Golden Path: typed publish methods with specific event type argument
   - Example: `publishOrderPlaced(event: OrderPlacedEvent)`
   - TypeScript enforces correct event type at compile time
   - Detection: get argument type, match to already-extracted Event component
   - No argument analysis or inline `new` required
   - ESLint enforces Event classes have required static properties

3. **Confidence thresholds** — Removed. Not applicable without Discovery layer.

4. **Inheritance chains** — Non-issue. ts-morph resolves inherited properties/methods. Inheritance is transparent to connection detection.

5. **Interface vs implementation** — ✅ RESOLVED
   - Golden Path: prefer concrete types (follows design-for-extraction principle)
   - Single implementation: auto-resolve if interface has exactly one implementing class
   - Config mapping: last resort for legacy codebases, not type-safe so discouraged

6. **Performance targets** — ✅ RESOLVED
   - No targets set upfront
   - Record actual times during implementation
   - Duration must be highly visible in CLI output
   - Decide acceptable thresholds after benchmarking against ecommerce-demo-app

---

## 7. Milestones

### Parallelization

```text
Track A: [M1: Core extraction - call graph + sync + async connections]
Track B: [M2: Interfaces] → [M3: ESLint] → [M4: Demo refactor]  (parallel with A)
Track C: [M5: Configurable layer]                               (after A design)
Track D: [M6: Documentation]                                    (parallel)
```

Track A and B can run in parallel once interface design is agreed. Track C waits for A to be designed. Track D runs throughout.

---

### M1: Core Connection Extraction (Track A)

Call graph tracing through non-components, sync connections, async connections.

#### Deliverables

- **D1.1:** Call graph builder
  - Build call graph from TypeScript AST using ts-morph
  - Trace method calls through non-component classes
  - Filter to component-to-component edges
  - Verification: Unit tests, integration test against demo app

- **D1.2:** Sync connection detection
  - Constructor injection (typed parameters)
  - Direct method calls on component instances
  - Verification: Unit tests with 100% coverage

- **D1.3:** Async connection detection
  - Typed publish methods: `publishOrderPlaced(event: OrderPlacedEvent)`
  - Match argument type to already-extracted Event components
  - Verification: Unit tests with 100% coverage

- **D1.4:** Performance instrumentation
  - Record extraction duration
  - Display prominently in CLI output
  - Verification: Duration visible in `riviere extract` output

---

### M2: Connection Conventions Interfaces (Track B)

TypeScript interfaces for typed publish methods.

#### Deliverables

- **D2.1:** Publish method interface pattern
  - Define how typed publish methods should be structured
  - Ensure Event type is extractable from method signature
  - Verification: Demo app compiles with interfaces

---

### M3: ESLint Enforcement (Track B)

ESLint rules for connection conventions.

#### Deliverables

- **D3.1:** Event class validation rule
  - Event classes must have required static properties
  - Verification: Rule catches violations in test fixtures

- **D3.2:** Publish method validation rule
  - Validate typed publish methods follow convention
  - Verification: Rule catches violations in test fixtures

---

### M4: Demo App Refactor (Track B)

Update ecommerce-demo-app to follow connection conventions.

#### Deliverables

- **D4.1:** Refactor event publishing
  - Replace generic `publishEvent()` with typed publish methods
  - Verification: Demo app compiles, extraction produces expected connections

- **D4.2:** Validate full extraction
  - Extract complete graph from demo app
  - Compare against expected connections
  - Verification: 100% expected connections detected

---

### M5: Configurable Layer (Track C)

Custom pattern DSL for teams with different conventions.

#### Deliverables

- **D5.1:** Connection pattern DSL
  - Extend extraction config with connection patterns
  - Support custom publish function names
  - Support custom event argument positions
  - Verification: Config validation + extraction tests

- **D5.2:** Interface resolution config
  - Config for interface-to-implementation mapping
  - Last resort for legacy codebases
  - Verification: Integration test with interface-heavy code

---

### M6: Documentation (Track D)

"Design for Extraction" guide and reference docs.

#### Deliverables

- **D6.1:** Design for Extraction guide
  - Why code design affects extraction accuracy
  - Golden Path conventions with examples
  - Migration guide from legacy patterns
  - Location: `docs/guides/design-for-extraction.md`
  - Verification: Doc exists, reviewed

- **D6.2:** Connection DSL reference
  - Config options for connection extraction
  - Examples for common frameworks
  - Verification: Doc exists, reviewed

---

## 8. Dependencies

**Depends on:**
- Phase 10 (TypeScript Component Extraction) — Component identification
- Phase 11 (Metadata Extraction) — Metadata for semantic linking

**Blocks:**
- Phase 13 (Extraction Workflows) — Workflows orchestrate connection extraction
- Phase 14 (Cross-Repo Linking) — Single-graph connections needed first

---

## 9. Research References

- [Static JavaScript Call Graphs: Comparative Study](https://arxiv.org/html/2405.07206v1) — ACG achieves 99% precision, 91% recall
- [Jelly Static Analyzer](https://github.com/cs-au-dk/jelly) — Approximate interpretation for JS/TS
- [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS) — Architectural testing for TypeScript
- [Reducing Static Analysis Unsoundness](https://dl.acm.org/doi/10.1145/3656424) — Academic techniques
- [@wessberg/DI](https://github.com/wessberg/DI) — Compile-time DI patterns

---

## 10. Terminology

| Term | Definition |
|------|------------|
| **Connection** | A link between two components representing operational flow |
| **Golden Path** | Convention-based extraction achieving 100% accuracy |
| **Configurable** | Pattern-matching extraction for custom conventions |
| **Call Graph** | The complete chain of method calls through the code |
| **Transparent** | Non-component classes are traced through but not shown in output |
