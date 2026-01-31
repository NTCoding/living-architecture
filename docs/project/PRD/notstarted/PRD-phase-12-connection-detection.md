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

When tracing flows, we trace through ALL code but only show components in the graph. Non-component classes (repositories, services, utilities) are invisible — we trace through them. A non-component is any class that does not appear in Phase 10/11 extraction output.

```text
Code call chain:     UseCase → Repository → Order.begin()
                               (not a component)

Graph shows:         UseCase → Order
```

This means we must build a **scoped call graph** — starting from known components and tracing outward through method calls — then filter to component-to-component edges. This is NOT whole-program call graph analysis; we only trace paths that originate from or pass through identified components.

**The core challenge:** JavaScript/TypeScript's dynamism makes call graph extraction inherently difficult. Academic research shows even best-in-class tools achieve ~91% recall — meaning they miss ~9% of real connections.

**Our insight:** If you **design code for extraction**, extraction becomes tractable. Codebases following our conventions can achieve 100% accurate extraction. Codebases that don't can still extract connections via configurable patterns or AI assistance.

**Why 100% is achievable for Golden Path:** Golden Path conventions require explicit types on constructor parameters and method signatures. This means connection detection uses **type-based resolution** — resolve calls via declared types, no flow-sensitive analysis or alias tracking needed. If the type is explicit, we resolve it. If not, fail fast.

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

| Layer | Accuracy | Use Case |
|-------|----------|----------|
| **Golden Path** | Deterministic (100% for supported patterns) | Teams using our conventions |
| **Configurable** | Pattern-dependent | Teams with existing patterns |

**Layer selection is per-extraction, not per-codebase.** A team might use Golden Path for their new code while using Configurable for modules with different conventions.

AI-assisted extraction already exists as a separate capability. Phase 12 focuses on deterministic extraction.

### 2.3 Fail Fast, Be Explicit

When Golden Path extraction cannot determine a connection with certainty:
- **Strict mode (default):** Fail with error message including: file path, line number, what failed (e.g., "unresolvable type"), and why (e.g., "interface IOrderRepository has 3 implementations")
- **Lenient mode (`--allow-incomplete`):** Emit the link with an `_uncertain` field containing the reason for uncertainty (e.g., `"multiple implementations of IOrderRepository"`)

Uncertain links in lenient mode are included in the same `links` array with `_uncertain: string` — not a separate array. Strict mode output is a subset of lenient mode output (uncertain links are omitted entirely in strict mode).

Users should know exactly what was extracted and what wasn't. No silent failures.

### 2.4 Connections Have Source Locations

Every detected connection must reference where in the code it was detected. This enables:
- Clicking through from visualization to code
- Validating extraction correctness
- Understanding why a connection was detected

For transitive connections through non-components, the source location references the call site in the **source component** (where the chain originates), not intermediate non-component call sites.

This is an acceptance criterion on all connection detection deliverables, not a separate capability.

### 2.5 Type-Based Resolution

Connection detection uses **type-based resolution**: resolve method calls via the declared types of constructor parameters, fields, and variables. No flow-sensitive analysis, no alias tracking, no whole-program points-to analysis.

This is what makes Golden Path achievable — explicit types in code mean deterministic resolution in the extractor. When a type cannot be resolved (e.g., `any`, untyped variable), strict mode fails; lenient mode marks the connection as uncertain.

**Call graph algorithm:**

1. **Internal representation:** Method-level call graph. Nodes are methods, edges are method-to-method call sites resolved via declared types.
2. **Traversal:** From each component method, trace outward via DFS through method calls. Maintain a visited set per traversal path to handle cycles.
3. **Type resolution:** Resolve the receiver type of each call from constructor parameters, fields, or local variable declarations. Generic types match against the base type (e.g., `Repository<Order>` matches component `Repository`).
4. **Collapse:** After tracing, collapse non-component nodes to produce component-to-component links. One link per unique (source component, target component, type) tuple.
5. **Component lookup:** Phase 12 builds its own index from `EnrichedComponent[]` + AST. For method-level components (e.g., DomainOp), use `location.file` + `location.line` to locate the method in the AST and resolve its parent class.

**What is and isn't traced:**

| Pattern | Traced? | Reason |
|---------|---------|--------|
| `this.repo.save(order)` | ✅ | Direct method call, receiver type resolved |
| `await this.repo.save(order)` | ✅ | `await` is transparent |
| `this.repo.config` | ❌ | Property access, not a method call |
| `this.repo.find(id).then(...)` | ✅ call only | `find()` traced; `.then()` callback not traced (requires flow analysis) |
| `const r = this.repo; r.save()` | ❌ | Requires alias tracking (out of scope) |
| Chained calls `a.b().c()` | ✅ each | Each call resolved independently via declared return type |

---

## 3. What We're Building

### 3.1 Golden Path — Convention-Based Extraction

**Pattern: Type-Based Method Call Detection**

Constructor parameters provide **type information** for resolving method calls. The connection comes from calling a method on a component-typed instance, not from the constructor declaration itself. An injected dependency that is never called does not create a link — it must represent actual operational flow.

```typescript
class PlaceOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,  // provides type info for resolution
    private eventBus: EventBus
  ) {}

  execute(input: PlaceOrderInput) {
    const order = this.orderRepo.findById(input.orderId);  // → link to OrderRepository
    order.begin();                                           // → link to Order.begin DomainOp
  }
}
```

The extractor resolves `this.orderRepo` to type `OrderRepository` (from the constructor parameter declaration), then checks whether `OrderRepository` is in the known components set (from Phase 10/11 extraction output). If yes, the method call creates a link.

**Pattern: Explicit Event Publishing**

```typescript
// Connection detected via typed publish method signature
class OrderPublisher {
  publishOrderPlaced(event: OrderPlacedEvent): void {
    this.eventBus.publish(event);
  }
}
```

The extractor identifies methods whose parameter types are known Event components. Event matching: exact, case-sensitive string match of the parameter type name against Event component `metadata.eventName` from Phase 11 output. Zero matches in strict mode = fail. Multiple matches = fail (ambiguous). Lenient mode marks uncertain for both cases.

If the class containing the publish method is a component, it is the link source. If not, non-component transparency applies — trace back to the calling component.

**Pattern: Event Handler Subscription**

```typescript
// Connection detected via subscribedEvents metadata (from Phase 11)
class OrderPlacedHandler implements EventHandlerDef {
  static readonly subscribedEvents = ['OrderPlaced'] as const;
}
```

Event → EventHandler connection derived from `subscribedEvents` metadata. Event names in `subscribedEvents` array matched to Event components via exact, case-sensitive string match against `metadata.eventName`.

**Pattern: Single-Implementation Interface Resolution**

```typescript
// Constructor declares interface type
class PlaceOrderUseCase {
  constructor(private repo: IOrderRepository) {}
}

// Exactly one class implements it
class OrderRepository implements IOrderRepository { ... }
```

When a constructor parameter or field is typed as an interface with exactly one implementing class, auto-resolve to the concrete type. Resolution scope: all TypeScript source files matched by extraction config module globs (node_modules excluded). Zero implementations or multiple implementations: fail fast in strict mode, mark as uncertain in lenient mode.

### 3.2 Configurable — Pattern Matching Extraction

For teams with existing conventions that differ from Golden Path.

**Core DSL — method call matching:**

```yaml
connections:
  patterns:
    - name: custom-event-emitter
      find: methodCalls
      where:
        methodName: emit
        receiverType: CustomEventEmitter
      extract:
        eventName: { fromArgument: 0 }
      linkType: async
```

**Decorator-based matching (advanced):**

```yaml
connections:
  patterns:
    - name: nestjs-controller-to-service
      find: methodCalls
      where:
        callerHasDecorator: [Controller]
        calleeType: { hasDecorator: Injectable }
      linkType: sync
```

Decorator matching is name-only. `@Controller('/orders')` matches decorator name `Controller`. Parameters are ignored. Composed and factory decorators are not resolved — only direct decorators on the class are matched.

**Extraction rules (extending Phase 11 patterns):**
- `fromArgument: N` — Extract from method argument
- `fromReceiverType` — Extract from the object being called
- `fromCallerType` — Extract from the calling class

**Interface resolution config:**

```yaml
connections:
  interfaceMappings:
    IOrderRepository: OrderRepository
    IPaymentGateway: StripePaymentGateway
```

Manual mapping for legacy codebases where auto-resolve doesn't work. Not type-safe, not validated against source. Prefer Golden Path conventions or single-implementation auto-resolve.

Connection config schema added to `riviere-extract-config` package. New `connections` top-level key in extraction config, validated by JSON Schema.

### 3.3 Connection Output Format

Output conforms to the `Link` type from `riviere-schema` (with the addition of `_uncertain` for lenient mode). The examples below are illustrative — the schema is the spec.

The `repository` field in `sourceLocation` is populated from extraction config.

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

# With configurable patterns (additive — Golden Path always runs, --patterns enables Configurable layer on top)
riviere extract --config ./config.yaml --patterns

# Lenient mode (emit uncertain links with _uncertain field instead of failing)
riviere extract --config ./config.yaml --allow-incomplete

# Show connection statistics (connection counts by type and detection method, uncertain link count)
riviere extract --config ./config.yaml --stats

# Dry run: run full extraction, output to stdout, do not write file
riviere extract --config ./config.yaml --dry-run
```

### 3.5 Performance Characteristics

| Layer | Expected Performance | Memory | Notes |
|-------|---------------------|--------|-------|
| Golden Path | TBD | TBD | Scoped call graph tracing + filtering |
| Configurable | TBD | TBD | Custom pattern matching |

Performance benchmarks against ecommerce-demo-app required. Duration displayed as final summary line: `Extraction completed in Xs (call graph: Xs, detection: Xs, filtering: Xs)`. Actual durations documented after initial implementation to establish baselines in `docs/architecture/performance/phase-12-baselines.md`.

### 3.6 "Design for Extraction" Documentation

Guide covering:
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
| **Whole-program call graph** | We build scoped call graphs from known components, not exhaustive whole-program analysis |
| **Flow-sensitive analysis** | Golden Path uses type-based resolution; no alias tracking or points-to analysis |
| **HTTP client detection** | Deferred — complex, cross-repo implications |
| **Property injection, setter injection, method parameter injection** | Use Configurable layer for these patterns |
| **Promise `.then()` callback tracing** | Requires flow analysis; out of scope |
| **Variable alias tracking** | `const r = this.repo; r.save()` not supported; requires flow analysis |

---

## 5. Success Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Golden Path extracts sync connections (method calls on component-typed instances) with source locations | Unit tests with 100% branch coverage of connection detection module |
| 2 | Golden Path extracts async connections (typed publish methods, event handler subscriptions) with source locations | Unit tests with 100% branch coverage of connection detection module |
| 3 | Scoped call graph traces through non-components correctly (single-hop, multi-hop, dead-end chains, cycles) | Integration tests against demo app |
| 4 | Single-implementation interfaces auto-resolve; zero/multiple fail fast | Unit tests covering zero, one, and multiple implementation cases |
| 5 | Configurable layer supports custom patterns via DSL | Config validation + extraction tests |
| 6 | ecommerce-demo-app achieves 100% connection extraction against defined ground truth | Comparison on (source, target, type) fields. Zero false positives, zero false negatives. |
| 7 | Performance baselines documented in `docs/architecture/performance/phase-12-baselines.md` | Each layer benchmarked against demo app, durations recorded |
| 8 | "Design for Extraction" guide published at `docs/guides/design-for-extraction.md` | Doc exists with all sections listed in D5.1, no TODO/TBD placeholders |
| 9 | Connection DSL documented | Doc exists with all sections listed in D5.2, no TODO/TBD placeholders |

---

## 6. Open Questions

1. **Transitive connections** — ✅ RESOLVED
   - Trace through non-components to find component-to-component flows
   - `UseCase → Repo → Order` shows as `UseCase → Order`
   - Source location references the call site in the source component

2. **Event publishing pattern** — ✅ RESOLVED
   - Golden Path: typed publish methods with specific event type argument
   - Example: `publishOrderPlaced(event: OrderPlacedEvent)`
   - TypeScript enforces correct event type at compile time
   - Detection: get argument type, match to already-extracted Event component via exact case-sensitive match on `metadata.eventName`
   - No argument analysis or inline `new` required
   - ESLint enforces Event classes have required static properties

3. **Confidence thresholds** — Removed. Lenient mode uses `_uncertain` field with reason string, not confidence scores.

4. **Inheritance chains** — Non-issue. ts-morph resolves inherited properties/methods. Inheritance is transparent to connection detection.

5. **Interface vs implementation** — ✅ RESOLVED
   - Golden Path: prefer concrete types (follows design-for-extraction principle)
   - Single implementation: auto-resolve if interface has exactly one implementing class within extraction config module globs (node_modules excluded)
   - Config mapping: manual mapping for legacy codebases, not type-safe so discouraged

6. **Performance targets** — ✅ RESOLVED
   - No targets set upfront
   - Record actual times during implementation
   - Duration displayed as final summary line with per-phase breakdown
   - Baselines recorded in `docs/architecture/performance/phase-12-baselines.md`
   - Decide acceptable thresholds after benchmarking against ecommerce-demo-app

7. **Call graph scope** — ✅ RESOLVED
   - Method-level internal call graph, collapsed to component-level for output
   - Type-based resolution: resolve via declared types, no flow-sensitive analysis
   - Cycle detection via visited set per traversal path
   - One link per unique (source, target, type) tuple
   - 100% accuracy achievable because Golden Path requires explicit types

8. **Generic types** — ✅ RESOLVED
   - Match against base type, ignore generic arguments
   - `Repository<Order>` matches component `Repository`

---

## 7. Milestones

### M1: Core Connection Extraction

All core connection types are extractable end-to-end. Scoped call graph traces through non-components, sync and async connections detected, CLI integration complete.

#### Deliverables

- **D1.1:** Scoped call graph construction
  - Build method-level call graph from known components using ts-morph
  - Type-based resolution: resolve calls via declared types on constructor parameters, fields, and variables
  - Build component lookup index from `EnrichedComponent[]` + AST (using `location.file` + `location.line` to resolve parent class for method-level components)
  - Cycle detection: maintain visited set per traversal path, skip already-visited methods
  - No flow-sensitive analysis or alias tracking
  - When type cannot be resolved: strict mode fails with error including file path, line number, unresolvable type name, and reason; lenient mode emits link with `_uncertain` field
  - Verification: Unit tests with 100% branch coverage

- **D1.2:** Non-component transparency
  - When a call chain passes through a non-component class, continue tracing until hitting another component or dead end
  - Produce component-to-component edges with the non-component chain elided
  - Handle chains of multiple non-components (A → non1 → non2 → B produces A → B)
  - Source location for transitive connections: the call site in the source component
  - One link per unique (source component, target component, type) tuple; if multiple call sites exist, source location references the first occurrence
  - Verification: Unit tests covering single-hop, multi-hop, dead-end chains, and cycles

- **D1.3:** Single-implementation interface resolution
  - When a type is an interface with exactly one implementing class within extraction config module globs (node_modules excluded), auto-resolve to the concrete type
  - Zero implementations: fail fast in strict mode, mark uncertain in lenient mode
  - Multiple implementations: fail fast in strict mode, mark uncertain in lenient mode
  - Verification: Unit tests covering zero, one, and multiple implementation cases

- **D1.4:** Sync connection detection
  - Method calls on component-typed instances: detect connections when calling methods on instances whose declared type is a known component
  - Constructor parameters provide type information for resolution — the method call creates the link, not the constructor declaration
  - Every connection includes `sourceLocation` (file path, line number, method name)
  - Verification: Unit tests with 100% branch coverage

- **D1.5:** Async connection detection — publish side
  - Typed publish methods: detect methods whose parameter types match known Event components from Phase 11
  - Match parameter type name to Event component `metadata.eventName` — exact, case-sensitive string match
  - Zero matches: fail in strict mode, mark uncertain in lenient mode. Multiple matches: fail in strict mode, mark uncertain in lenient mode
  - If class containing publish method is a component, it is the link source; if not, apply non-component transparency
  - Every connection includes `sourceLocation`
  - Depends on: D1.7 (publish method convention must be defined first)
  - Verification: Unit tests with 100% branch coverage

- **D1.6:** Async connection detection — subscribe side
  - Derive Event → EventHandler connections from `subscribedEvents` metadata extracted in Phase 11
  - Match event names in `subscribedEvents` array to Event component `metadata.eventName` — exact, case-sensitive string match
  - Zero matches: fail in strict mode, mark uncertain in lenient mode
  - Every connection includes `sourceLocation`
  - Verification: Unit tests with 100% branch coverage

- **D1.7:** Publish method interface pattern
  - Define how typed publish methods should be structured (interface/abstract class)
  - Ensure Event type is extractable from method signature
  - Provide in `riviere-extract-conventions` package
  - Verification: Interface/abstract class exists in package. Demo app implements it for at least 3 event types. Extractor detects all 3 publish connections with correct source locations. TypeScript compilation has zero errors.

- **D1.8:** Performance instrumentation
  - Record extraction duration per phase (call graph construction, connection detection, filtering)
  - Display as final summary line: `Extraction completed in Xs (call graph: Xs, detection: Xs, filtering: Xs)`
  - Record baseline durations when D3.3 (full extraction validation) passes, document in `docs/architecture/performance/phase-12-baselines.md`
  - Verification: Duration visible in `riviere extract` output, baseline file exists with recorded numbers

- **D1.9:** CLI integration for connection extraction
  - Wire connection extraction into `riviere extract` command
  - `--patterns`: enable Configurable layer in addition to Golden Path
  - `--allow-incomplete`: lenient mode (emit uncertain links with `_uncertain` field instead of failing)
  - `--stats`: append summary showing connection counts by type (sync/async), by detection method, and uncertain link count
  - `--dry-run`: run full extraction, output to stdout, do not write file
  - Verification: CLI produces output conforming to Riviere schema `Link` type

---

### M2: ESLint Enforcement (Validation)

ESLint rule enforcing publish method convention. Ensures teams following Golden Path maintain extractable patterns.

#### Deliverables

- **D2.1:** Publish method validation rule
  - Validate typed publish methods follow convention defined in D1.7
  - Depends on: D1.7 (convention must be defined before enforcement rule)
  - Verification: Rule catches violations in test fixtures

---

### M3: Demo App Validation (Validation)

Validate extraction against ecommerce-demo-app with defined ground truth.

#### Deliverables

- **D3.1:** Define expected connections ground truth
  - Create a ground truth file listing all expected component-to-component connections in the demo app
  - Ground truth must exist before running extraction — not derived from extraction output
  - Format: JSON or YAML matching Riviere schema `links` structure
  - Verification: File exists, validates against Riviere schema Link array type

- **D3.2:** Refactor event publishing
  - Replace generic `publishEvent()` with typed publish methods following D1.7 pattern
  - Verification: Demo app compiles, ESLint rules pass

- **D3.3:** Validate full extraction
  - Extract complete graph from demo app
  - Compare against ground truth from D3.1
  - Comparison on (source, target, type) fields — zero false positives, zero false negatives
  - Verification: Extraction output matches ground truth exactly

---

### M4: Configurable Layer

Custom pattern DSL for teams with different conventions.

#### Deliverables

- **D4.1:** Core connection pattern DSL
  - `methodCalls` finder with `where` clauses: `methodName`, `receiverType`
  - `extract` rules: `fromArgument`, `fromReceiverType`, `fromCallerType`
  - `linkType`: sync or async
  - Connection config schema added to `riviere-extract-config` package with JSON Schema validation
  - Verification: Config validation + extraction tests against test fixtures

- **D4.2:** Decorator-based matching
  - `callerHasDecorator`, `calleeType.hasDecorator` clauses
  - Name-only matching: `@Controller('/orders')` matches `Controller`. Parameters ignored. Composed/factory decorators not resolved.
  - Verification: Extraction tests against NestJS-style test fixtures

- **D4.3:** Interface resolution config
  - Config for explicit interface-to-implementation mapping
  - Manual mapping for legacy codebases where auto-resolve (D1.3) doesn't work. Not type-safe, not validated against source.
  - Verification: Integration test with interface-heavy code

---

### M5: Documentation

"Design for Extraction" guide and reference docs.

#### Deliverables

- **D5.1:** Design for Extraction guide
  - Why code design affects extraction accuracy
  - Golden Path conventions with examples
  - Migration guide from legacy patterns
  - Location: `docs/guides/design-for-extraction.md`
  - Verification: Doc exists at specified path, contains all sections listed above, no TODO/TBD placeholders

- **D5.2:** Connection DSL reference
  - Config options for connection extraction
  - Examples for common frameworks (NestJS, Express, custom event emitters)
  - Verification: Doc exists, contains all sections listed above, no TODO/TBD placeholders

---

## 8. Parallelization

```yaml
tracks:
  - id: A
    name: Core Extraction
    deliverables:
      - D1.1
      - D1.2
      - D1.3
      - D1.4
      - D1.7
      - D1.5
      - D1.6
      - D1.8
      - D1.9
  - id: B
    name: Enforcement & Validation
    deliverables:
      - D2.1
      - D3.1
      - D3.2
      - D3.3
  - id: C
    name: Configurable Layer
    deliverables:
      - D4.1
      - D4.2
      - D4.3
  - id: D
    name: Documentation
    deliverables:
      - D5.1
      - D5.2
```

**Dependencies between tracks:**
- Track A: D1.7 must complete before D1.5 (publish method convention must exist before detection)
- Track B: D2.1 depends on D1.7 (convention must be defined before enforcement rule)
- Track B: D3.2 and D3.3 depend on Track A (D1.7 for publish pattern, D1.4/D1.5/D1.6 for extraction)
- Track B: D3.1 (ground truth) can start immediately, independent of Track A
- Track C can start after D1.1 and D1.2 are merged (call graph construction API established)
- Track D can start immediately and run throughout

---

## 9. Dependencies

**Depends on:**
- Phase 10 (TypeScript Component Extraction) — Component identification
- Phase 11 (Metadata Extraction) — Metadata for semantic linking (especially `eventName` and `subscribedEvents`)

**Blocks:**
- Phase 13 (Extraction Workflows) — Workflows orchestrate connection extraction
- Phase 14 (Cross-Repo Linking) — Single-graph connections needed first

---

## 10. Research References

- [Static JavaScript Call Graphs: Comparative Study](https://arxiv.org/html/2405.07206v1) — ACG achieves 99% precision, 91% recall
- [Jelly Static Analyzer](https://github.com/cs-au-dk/jelly) — Approximate interpretation for JS/TS
- [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS) — Architectural testing for TypeScript
- [Reducing Static Analysis Unsoundness](https://dl.acm.org/doi/10.1145/3656424) — Academic techniques
- [@wessberg/DI](https://github.com/wessberg/DI) — Compile-time DI patterns

---

## 11. Terminology

| Term | Definition |
|------|------------|
| **Connection Detection** | The Phase 12 activity of identifying links between components. Produces Links (Riviere schema type). |
| **Link** | A directed connection between two components in the Riviere schema, representing operational flow. The output of connection detection. |
| **Golden Path** | Convention-based extraction achieving 100% accuracy for supported patterns |
| **Configurable** | Pattern-matching extraction for custom conventions. Accuracy depends on pattern quality. |
| **Scoped Call Graph** | Method-level call graph built by tracing outward from known components, collapsed to component-level for output. Not whole-program analysis. |
| **Type-Based Resolution** | Resolving method calls via declared types (constructor parameters, fields, variables), without flow-sensitive analysis |
| **Transparent** | Non-component classes are traced through but not shown in output. A non-component is any class not in Phase 10/11 extraction output. |
