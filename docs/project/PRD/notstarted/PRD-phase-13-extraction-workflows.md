# PRD: Phase 13 — Extraction Workflows

**Status:** Draft

**Depends on:** Phase 12 (Connection Detection)

---

## 1. Problem

Riviere extraction today is a sequence of manual CLI commands. Extracting a complete architecture graph from a real system requires:

1. Running `riviere extract` per codebase with the right config and flags
2. Manually importing data from external specs (EventCatalog, AsyncAPI) — no tooling exists for this
3. Identifying gaps in extraction and running AI to fill them — no orchestration for this
4. Combining all outputs into a single valid graph — no merging capability exists
5. Re-running everything when code changes

For a team with 3 microservices, an EventCatalog, and an AsyncAPI spec, this means 5+ manual steps every time code changes. It's error-prone, not CI-friendly, and requires deep knowledge of Riviere's CLI.

**Workflows are the primary interface for using Riviere.** Users define a workflow once — what sources to extract from, what specs to import, what AI steps to run — and execute it with a single command. Workflows replace the manual multi-command approach as the standard way to build architecture graphs.

**Who uses workflows:** Anyone using Riviere. Individual developers, platform teams, CI pipelines. Not a power-user feature — the default way to use the product.

---

## 2. Design Principles

### 2.1 Workflows Are Riviere Workflows

This is not a generic workflow engine. Workflows are purpose-built for Riviere extraction. Every step receives the `RiviereBuilder` and calls its API to construct the graph. The builder is the single source of truth for graph construction — ID generation, validation, deduplication all go through the builder.

**Trade-off:** We sacrifice generality for simplicity and correctness. A generic engine would require intermediate representations, merge logic, and format translation. Builder-centric workflows get all of that for free from the existing builder infrastructure.

### 2.2 Sources of Truth First

**If a source of truth exists, use it.** Don't analyze code when a spec already describes the architecture.

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Existing specs | AsyncAPI, EventCatalog |
| 2 | Code with conventions | Golden Path extraction (Phase 12) |
| 3 | Code with patterns | Configurable extraction (Phase 12) |
| 4 | AI discovery | Fill gaps, enrich metadata |

Teams that maintain AsyncAPI specs for their events shouldn't need to configure event extraction rules — the workflow imports the spec directly.

### 2.3 Steps Own Their Config

The workflow file defines step execution order. That's it. Each step references its own config file(s) containing all the information that step needs — sources, domains, extraction rules, mappings. The workflow file knows nothing about graph structure, domains, or components.

**Rationale:** Mixing graph configuration into the workflow file couples the orchestration definition to extraction details. Step configs are created during workflow setup (`riviere workflow init`). The workflow just sequences them.

### 2.4 CI-First

Workflows must run in CI without human intervention. `riviere workflow run ./riviere-workflow.yaml` is a single command that produces a complete graph. No interactive prompts during execution. Setup is interactive (`riviere workflow init`); execution is fully automated.

### 2.5 Incremental Learning

When a user corrects an AI suggestion or refines a mapping, that correction is persisted in config files — not in the workflow engine's memory. Future runs use the updated configs. Deterministic steps produce the same output every time; AI steps improve as configs are refined.

### 2.6 Generic Engine, Domain-Specific Steps

The workflow engine is generic — it executes steps sequentially, passing context. It knows nothing about extraction, events, or AI. Each step type implements a common interface and contains all domain-specific logic. This separation enables extensibility: custom steps implement the same interface.

**Steps are isolated.** A step can only access its own config and the shared builder. No cross-step state, no access to other steps' configs, no workflow metadata beyond what's in the context.

---

## 3. What We're Building

### 3.1 Workflow Definition Format

YAML with JSON Schema validation. Consistent with extraction config (Phase 11). Workflow JSON Schema lives in `riviere-extract-config` alongside the existing extraction config schema.

```yaml
name: ecommerce-architecture
output: ./architecture.json

steps:
  - name: extract-orders
    type: code-extraction
    config: ./orders/riviere-config.yaml

  - name: extract-shipping
    type: code-extraction
    config: ./shipping/riviere-config.yaml
    patterns: true

  - name: import-events
    type: eventcatalog-import
    source: ./eventcatalog
    mappings: ./eventcatalog-mappings.yaml

  - name: import-broker
    type: asyncapi-import
    source: ./broker/asyncapi.yaml
    mappings: ./asyncapi-mappings.yaml

  - name: discover-gaps
    type: ai-extract
    sources: [./orders/src, ./shipping/src]
    confidence-threshold: 0.8

  - name: enrich-metadata
    type: ai-enrich
    confidence-threshold: 0.8

  - name: validate
    type: schema-validate
```

**Execution model:** Steps run sequentially, top to bottom. All steps share the same `RiviereBuilder` instance (passed by reference). Builder state accumulates across steps. If a step throws, the workflow aborts and no output is written.

**Workflow schema:** JSON Schema validates the workflow file structure (name, output, steps array with name and type required). Step-specific fields (`config`, `source`, `mappings`, etc.) are validated by each step handler's own `validateConfig` method, not by the workflow schema.

**Output:** Always the result of `builder.build()` — a validated `RiviereGraph` written as JSON to the `output` path. One output file per workflow.

### 3.2 Workflow Step Interface

Every step — built-in or custom — implements this interface:

```typescript
interface WorkflowStepHandler<TConfig = Record<string, unknown>> {
  validateConfig(raw: unknown): TConfig
  execute(context: StepContext<TConfig>): Promise<void>
}

interface StepContext<TConfig> {
  builder: RiviereBuilder
  config: TConfig
  logger: StepLogger
}
```

**`validateConfig`** — Each step validates and narrows its own config from the raw YAML. This runs before `execute`, during the validation phase. Type-safe config per step type — `code-extraction` gets `CodeExtractionConfig`, `eventcatalog-import` gets `EventCatalogImportConfig`, etc.

**`execute`** — Receives the typed config and builder. Performs step work. Returns void on success, throws on failure.

The workflow engine is decoupled from step implementations. It resolves step handlers by type name, calls `validateConfig` for each step, then executes them in order. The engine has zero imports from step implementation code.

### 3.3 Builder Initialization

The builder requires `sources` and `domains` at construction (`RiviereBuilder.new()`). In a workflow, the first step that adds components is responsible for initializing the builder.

**How it works:** The engine creates the builder lazily. The `StepContext.builder` is initially uninitialized. When a step first accesses the builder to add a domain or source, it calls `RiviereBuilder.new()` with its own config's sources/domains. Subsequent steps call `addSource()` and `addDomain()` on the existing builder to register their own sources and domains.

**`addDomain()` becomes idempotent:** If a domain with the same name already exists, the call is a no-op (no error). This handles the case where multiple steps reference the same domain. Same for `addSource()`.

**Any step type can be first.** A workflow starting with `eventcatalog-import` works — the importer's mappings config specifies which domains and sources to register, and it initializes the builder from that.

### 3.4 Built-in Step Types

#### `code-extraction`

Runs the Phase 10/11/12 extraction pipeline against a TypeScript codebase.

```yaml
  - name: extract-orders
    type: code-extraction
    config: ./orders/riviere-config.yaml    # Extraction config (Phase 11 format)
    patterns: true                           # Optional: enable Configurable layer
    allow-incomplete: true                   # Optional: lenient mode
```

The extraction config contains `sources`, `domains`, and `modules` with detection rules. The step registers sources/domains with the builder (initializing it if first step), then runs extraction and adds components/links.

#### `eventcatalog-import`

Imports components and connections from an EventCatalog instance. Uses `@eventcatalog/sdk` to read events, services, and producer/consumer relationships.

```yaml
  - name: import-events
    type: eventcatalog-import
    source: ./eventcatalog                   # EventCatalog directory
    mappings: ./eventcatalog-mappings.yaml   # How EventCatalog concepts map to Riviere
```

**Convention-based defaults:**

| EventCatalog Concept | Default Riviere Mapping |
|---------------------|------------------------|
| Domain | Domain (same name) |
| Service | Module within its domain |
| Event | Event component (`addEvent()`) |
| Service produces Event | Link (service → event, type: async) |
| Service consumes Event | EventHandler component + link (event → handler, type: async) |

**Mappings file — overrides only:**

```yaml
# eventcatalog-mappings.yaml
domains:
  OrdersDomain: orders          # EventCatalog domain name → Riviere domain name

services:
  OrdersService:
    domain: orders              # Override which Riviere domain this maps to
    module: checkout            # Override module name (default: kebab-case service name)

events:
  OrderCreated:
    name: OrderPlaced           # Override Riviere event name (default: same name)
```

If a mapping is missing and convention-based defaults can't resolve (e.g., EventCatalog service has no domain), strict mode fails with a clear error. Lenient mode skips the unmapped item and logs a warning.

#### `asyncapi-import`

Imports components and connections from an AsyncAPI spec. Uses `@asyncapi/parser`. Phase 13 targets AsyncAPI v3 only.

```yaml
  - name: import-broker
    type: asyncapi-import
    source: ./broker/asyncapi.yaml           # AsyncAPI spec file
    mappings: ./asyncapi-mappings.yaml       # How AsyncAPI concepts map to Riviere
```

**Convention-based defaults:**

| AsyncAPI Concept | Default Riviere Mapping |
|-----------------|------------------------|
| Message | Event component (message name → event name) |
| Operation (send) | Link (sender → event, type: async) |
| Operation (receive) | EventHandler component + link (event → handler, type: async) |
| Channel | Not mapped directly — channels are infrastructure |

**Mappings file — same structure as EventCatalog mappings:**

```yaml
# asyncapi-mappings.yaml
messages:
  OrderPlacedMessage:
    domain: orders
    module: checkout
    name: OrderPlaced            # Riviere event name

operations:
  processOrder:
    domain: orders
    module: checkout
```

#### `ai-extract`

Discovers components and connections that deterministic extraction missed. Analyzes source code directories, inspects the builder to see what's already been extracted, and identifies gaps.

```yaml
  - name: discover-gaps
    type: ai-extract
    sources: [./orders/src, ./shipping/src]  # Source directories to analyze
    confidence-threshold: 0.8                # Minimum confidence to add to graph
```

Components and links added by `ai-extract` carry metadata indicating they are AI-discovered with a confidence score. This metadata persists in the output graph so consumers can distinguish AI-discovered from deterministically-extracted.

**LLM provider:** Claude via `@anthropic-ai/claude-agent-sdk`. Uses the local Claude CLI — no API keys required. Same approach as the existing dev-workflow tooling in this project.

#### `ai-enrich`

Fills missing metadata fields on components already in the builder. Targets `_missing` fields from lenient mode extraction and any components lacking optional metadata.

```yaml
  - name: enrich-metadata
    type: ai-enrich
    confidence-threshold: 0.8
```

Reads source code context for each component with missing metadata and proposes values. Like `ai-extract`, enrichments carry AI-confidence metadata.

Same LLM provider as `ai-extract` — Claude via local CLI.

#### `schema-validate`

Validates the graph by calling `builder.build()`. Reports validation errors. This should typically be the final step. Validation is always strict — no lenient mode.

```yaml
  - name: validate
    type: schema-validate
```

On failure: logs validation errors from `BuildValidationError` and the workflow exits with code 1.

### 3.5 Builder Upsert Capability

`RiviereBuilder` gains upsert capability for multi-source graph construction. When a step adds a component that already exists (same ID), the builder enriches the existing component with new metadata rather than throwing `DuplicateComponentError`.

This is a builder-level capability, not workflow-specific. Multi-source graph construction is a core use case.

**New API method:**

```typescript
upsertComponent(input: ComponentInput): { component: Component, created: boolean }
```

- If component ID does not exist → creates component (same as `addComponent`)
- If component ID exists → merges metadata into existing component, returns `{ created: false }`

**Merge semantics:**
- **Scalar fields** (string, number, boolean): first source wins — existing value preserved, new value ignored unless existing is undefined/null
- **Array fields** (stateChanges, businessRules, subscribedEvents): union — new items appended, duplicates removed
- **Nested objects** (behavior, metadata): field-level merge — each nested field follows scalar rules
- **Required fields** (name, domain, type): must match. Mismatch is an error (same ID but different type = bug in mapping config)

**Link deduplication:** `link()` deduplicates by (source, target, type) tuple. Same link added twice is a no-op.

**`addDomain()` and `addSource()` become idempotent:** Adding a domain/source that already exists is a no-op. No error.

### 3.6 CLI Commands

```bash
# Run a workflow
riviere workflow run ./riviere-workflow.yaml

# Initialize a new workflow interactively
riviere workflow init

# Validate a workflow file without executing
riviere workflow validate ./riviere-workflow.yaml
```

#### `riviere workflow init`

Interactive setup that builds the workflow definition and step configs. Guides the user through:

1. What codebases to extract from → creates `code-extraction` steps and extraction configs
2. What external specs exist → creates import steps and mapping configs
3. Whether to include AI steps → adds `ai-extract` / `ai-enrich` steps
4. Validation step

Outputs the workflow YAML file and all referenced config/mapping files.

`riviere workflow init` is distinct from `riviere extract`. `extract` is for single-codebase extraction (Phase 10-12 direct usage). `workflow run` is for multi-source orchestration (Phase 13). They are separate commands — `extract` does not accept a `--workflow` flag.

#### `riviere workflow run`

Executes the workflow:

1. Load and parse YAML
2. Validate workflow structure against JSON Schema
3. Resolve step handlers by type name
4. Call `validateConfig()` on each step (fail-fast before execution)
5. Execute steps sequentially, passing shared builder
6. On success: write `builder.build()` output to `output` path
7. On failure: report which step failed, why, and exit code 1

**Error handling:** If a step fails, the workflow aborts. No retry, no skip, no partial output. Builder state is discarded.

**Distinction between error types:**
- **Config errors** (missing file, invalid YAML, schema violation): always fail, regardless of lenient mode
- **Extraction strictness** (`allow-incomplete`): controls whether unresolvable types produce errors or uncertain markers within a `code-extraction` step. Does not affect workflow-level error handling.

**Step summary output:** Each step logs completion with duration. Final line: `Workflow completed in Xs (step1: Xs, step2: Xs, ...)`.

#### `riviere workflow validate`

Two validation levels:
1. **Structural:** YAML parses, required fields present, all referenced config/mapping files exist on disk
2. **Semantic:** Each step handler's `validateConfig()` runs against its config (extraction configs validate against schema, mappings files parse correctly)

Does not execute steps.

### 3.7 Demo App Validation

Every capability is validated against `ecommerce-demo-app`. The demo app gains:

1. **EventCatalog instance** — describing the demo app's domain events, services, and producer/consumer relationships
2. **AsyncAPI spec** — describing the demo app's message broker channels and operations
3. **Mapping configs** — EventCatalog and AsyncAPI mappings for the demo app
4. **Workflow definition** — `riviere-workflow.yaml` exercising all built-in step types
5. **Ground truth** — expected complete graph after running the full workflow
6. **Deliberate extraction gaps** — code patterns that deterministic extraction can't handle, for AI step validation (e.g., dynamic event names via config lookup, runtime dependency injection)

**Demo app structure additions:**

```text
ecommerce-demo-app/
├── orders-domain/
│   ├── src/
│   └── riviere-config.yaml
├── shipping-domain/
│   ├── src/
│   └── riviere-config.yaml
├── specs/
│   ├── eventcatalog/
│   │   ├── domains/
│   │   ├── events/
│   │   └── services/
│   ├── asyncapi.yaml
│   ├── eventcatalog-mappings.yaml
│   └── asyncapi-mappings.yaml
├── riviere-workflow.yaml
└── tests/
    └── ground-truth.json
```

**Graph comparison semantics:**
- Components compared by ID (exact match on full set — no extra, no missing)
- Links compared by (source, target, type) tuple (exact match on full set)
- Metadata differences logged for debugging but not part of pass/fail
- AI-discovered components included in ground truth with expected confidence thresholds

**Workflow idempotency:** Running the same workflow twice with unchanged inputs must produce identical output. Validated by running twice and diffing.

---

## 4. What We're NOT Building

| Exclusion | Rationale |
|-----------|-----------|
| **Custom step types** | Extension point defined (step interface) but not user-facing in Phase 13. Built-in steps only. Adding new step types requires code changes to riviere-cli. Interface is internal — breaking changes allowed until stabilized. |
| **Parallel step execution** | Steps run sequentially. Parallelization is an optimization for later if needed. |
| **TypeScript workflow definitions** | YAML + JSON Schema for now. TypeScript config files are a future option for teams wanting type safety and composability. |
| **Workflow state / caching between runs** | Each run is stateless — produces a complete graph from scratch. Incremental extraction deferred. |
| **OpenAPI, GraphQL, Protobuf, Backstage importers** | Phase 13 includes EventCatalog and AsyncAPI (provide connection data). Component-only importers are lower value, deferred. |
| **Cross-repo linking** | Phase 14 scope. |
| **Cross-repo workflow orchestration** | Phase 14 will define how multi-repo graphs are built. |
| **Generic workflow engine features** | No conditionals, loops, branching, retry policies, continue-on-error, or DAG execution. Sequential steps only. |
| **Workflow composition** | Workflows cannot reference or import other workflows. |
| **Workflow versioning / migration** | No version compatibility checks or migration tooling for workflow format changes. |
| **Step rollback / partial success** | If a step fails, the workflow aborts entirely. No partial output, no undo. |
| **Multi-output workflows** | One workflow produces one output file. Multiple formats or artifacts require separate workflows. |
| **Step timeout / resource limits** | No per-step time or memory limits. |
| **Workflow execution history / audit** | No tracking of when workflows ran or what changed between runs. |

---

## 5. Success Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Workflow engine executes steps sequentially, passing shared builder between steps | Unit tests for engine with mock step handlers |
| 2 | `code-extraction` step works within workflow context (initializes builder on first run, adds to existing builder on subsequent steps) | Integration test: two `code-extraction` steps in one workflow |
| 3 | `eventcatalog-import` maps EventCatalog data to Riviere components and links via builder, using convention-based defaults | Integration test against demo app EventCatalog |
| 4 | `asyncapi-import` maps AsyncAPI v3 spec to Riviere components and links via builder | Integration test against demo app AsyncAPI spec |
| 5 | Builder `upsertComponent()` handles duplicate components across sources (enriches existing, deduplicates links, idempotent domain/source addition) | Unit tests in riviere-builder covering scalar merge, array union, required field mismatch |
| 6 | `ai-extract` discovers components/connections that deterministic extraction missed, with confidence metadata | Integration test against demo app deliberate gaps |
| 7 | `ai-enrich` fills missing metadata fields with confidence metadata | Integration test against demo app components with `_missing` fields |
| 8 | `riviere workflow run` produces valid graph from demo app workflow matching ground truth | End-to-end test: zero false positives, zero false negatives on component IDs and link (source, target, type) tuples |
| 9 | `riviere workflow init` produces valid workflow YAML and step configs | Init creates files, `workflow validate` passes, `workflow run` succeeds |
| 10 | `riviere workflow validate` catches invalid workflow files, missing config references, and invalid step configs | Unit tests for structural and semantic validation |
| 11 | Workflow JSON Schema validates workflow file structure | Schema published in `riviere-extract-config` |
| 12 | Step interface is generic — engine has zero imports from step implementations | Dependency-cruiser rule enforcement |
| 13 | Workflow runs are idempotent: same inputs produce identical output | E2E test: run twice, diff outputs, assert zero changes |
| 14 | Step summary output shows per-step duration and total workflow duration | Visible in `riviere workflow run` output |

---

## 6. Open Questions

1. **EventCatalog SDK sufficiency** — Does `@eventcatalog/sdk` expose everything we need (events, services, producer/consumer relationships, domains)? What version? Needs a spike to validate before committing to implementation.

2. **AsyncAPI parser capabilities** — Does `@asyncapi/parser` handle AsyncAPI v3 patterns we need? What's the mapping from operations to Riviere concepts for pub/sub vs request/reply? Needs a spike.

3. **AI prompt strategy** — What prompts produce reliable component discovery and metadata enrichment? What's the context window strategy for large codebases? Needs experimentation during implementation.

---

## 7. Dependencies

**Depends on:**
- Phase 12 (Connection Detection) — `code-extraction` step runs the Phase 10/11/12 pipeline. Requires Phase 12 M1 (Core Extraction) and M4 (Configurable Layer) to be complete. Assumes stable extraction config schema and `EnrichedComponent` interface.

**Blocks:**
- Phase 14 (Cross-Repo Linking) — Workflows enable multi-repo extraction

---

## 8. Research References

### Integration SDKs

| Tool | SDK/Package | License | Data Available |
|------|-------------|---------|----------------|
| [EventCatalog](https://github.com/event-catalog/sdk) | @eventcatalog/sdk | MIT | Events, services, producers/consumers, domains |
| [AsyncAPI](https://www.asyncapi.com/) | @asyncapi/parser | Apache 2.0 | Channels, messages, operations, schemas |

### AI Integration

- Claude via `@anthropic-ai/claude-agent-sdk` (local CLI, no API keys)
- Prompt strategies for code analysis and component discovery
- Confidence scoring approaches

---

## 9. Terminology

| Term | Definition |
|------|------------|
| **Workflow** | A YAML definition specifying a sequence of steps that produce a complete Riviere graph. The primary interface for using Riviere. |
| **Step** | A single unit of work in a workflow. Receives the builder, performs extraction/import/analysis, adds to the graph. Implements `WorkflowStepHandler`. |
| **Step Type** | A category of step with specific behavior: `code-extraction`, `eventcatalog-import`, `asyncapi-import`, `ai-extract`, `ai-enrich`, `schema-validate`. |
| **Step Config** | Configuration specific to a step type, stored in a separate file referenced by the workflow. Not part of the workflow definition. |
| **Mappings File** | Configuration defining how external data models (EventCatalog, AsyncAPI) map to Riviere concepts. Convention-based defaults with explicit overrides. |
| **Upsert** | Builder capability to add-or-enrich a component. If the component ID already exists, merge metadata. If not, create it. Enables multi-source graph construction. |
| **Workflow Init** | Interactive CLI command (`riviere workflow init`) that creates a workflow definition and all step configs. The setup process for new workflows. |
