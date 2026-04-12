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

| Priority | Source                | Example                            |
| -------- | --------------------- | ---------------------------------- |
| 1        | Existing specs        | AsyncAPI, EventCatalog             |
| 2        | Code with conventions | Golden Path extraction (Phase 12)  |
| 3        | Code with patterns    | Configurable extraction (Phase 12) |
| 4        | AI discovery          | Fill gaps, enrich metadata         |

Teams that maintain AsyncAPI specs for their events shouldn't need to configure event extraction rules — the workflow imports the spec directly.

### 2.3 Steps Own Their Config

Config files are the source of truth for step behavior. The workflow is the glue.

The workflow file defines:

- graph-wide builder inputs (`name`, `description`, `output`, `sources`, `domains`)
- step execution order
- which config file each step uses

Each step config defines everything about how that capability behaves — extraction rules, mappings, modules, AI selection rules, confidence thresholds, and other graph-affecting behavior.

**Rationale:** A user must get the same behavior from direct CLI usage and workflow usage. If a rule belongs to the capability itself, it belongs in the capability config. The workflow composes those capabilities into one graph build.

### 2.4 CI-First

Workflows must run in CI without human intervention. `riviere workflow run ./riviere-workflow.yaml` is a single command that produces a complete graph. No interactive prompts during execution. Setup is interactive (`riviere workflow init`); execution is fully automated.

### 2.5 Incremental Learning

When a user refines a mapping or otherwise updates a step config after reviewing workflow output, that correction lives in config files — not in workflow runtime memory. Future runs use the updated configs. Phase 13 does not include an automated AI review-and-accept loop.

### 2.6 Registry-Based Runtime, Built-In Steps First

Phase 13 introduces a dedicated `riviere-workflow` runtime package. The runtime resolves steps through a registry and executes them sequentially against a shared builder.

Phase 13 ships built-in step types only. User plugin loading is out of scope, but the runtime must be structured so future extension can add new step types without major rework.

**Exported extension seam:** `riviere-workflow` exports the step contract now. Built-in steps and future custom steps use the same interfaces.

**Steps are isolated.** A step can access only:

- its own validated config
- the shared builder
- logger
- fixed runtime services passed in `StepContext`

No step can read another step's config or rely on hidden cross-step state.

---

## 3. What We're Building

### 3.1 Workflow Definition Format

YAML with JSON Schema validation. Consistent with extraction config (Phase 11). Workflow JSON Schema lives in `riviere-extract-config` alongside the existing extraction config schema.

```yaml
name: ecommerce-architecture
description: Combined architecture graph for the ecommerce platform
output: ./architecture.json

sources:
  - repository: ecommerce-demo-app

domains:
  orders:
    description: Order lifecycle and checkout
    systemType: domain
  shipping:
    description: Shipment orchestration
    systemType: domain

steps:
  - name: import-events
    type: eventcatalog-import
    config: ./specs/eventcatalog-import.yaml

  - name: import-broker
    type: asyncapi-import
    config: ./specs/asyncapi-import.yaml

  - name: extract-orders
    type: code-extraction
    config: ./orders/riviere-config.yaml

  - name: extract-shipping
    type: code-extraction
    config: ./shipping/riviere-config.yaml

  - name: discover-gaps
    type: ai-extract
    config: ./steps/ai-extract.yaml

  - name: enrich-metadata
    type: ai-enrich
    config: ./steps/ai-enrich.yaml

  - name: validate
    type: schema-validate
```

**Execution model:** Steps run sequentially, top to bottom. All steps share the same `RiviereBuilder` instance (passed by reference). Builder state accumulates across steps. If a step throws, the workflow aborts and no output is written.

**Step order is semantic.** When multiple steps provide conflicting values for the same scalar field on the same canonical component, earlier steps win. Recommended order follows the source priority model in §2.2: specs first, code second, AI last.

**Workflow schema:** JSON Schema validates the workflow file structure (`output`, `sources`, `domains`, `steps[].name`, `steps[].type`, and `steps[].config` for steps that require config). Step-specific behavior is validated by each step handler's own `validateConfig()` method.

**Output:** Always the result of `builder.build()` — a validated `RiviereGraph` written as JSON to the `output` path. One output file per workflow.

**Boundary rule:** Workflow YAML may declare graph-wide builder inputs. It may not override step behavior. Fields like connection patterns, `allow-incomplete`, import mappings, AI field selection, and confidence thresholds belong in step config files.

### 3.2 Workflow Step Interface

Every step — built-in or custom — implements this interface:

```typescript
interface WorkflowStepHandler<TConfig = Record<string, unknown>> {
  validateConfig(raw: unknown): TConfig
  execute(context: StepContext<TConfig>): Promise<void>
}

interface WorkflowStepServices {
  ai?: AiProvider
}

interface StepContext<TConfig> {
  builder: RiviereBuilder
  config: TConfig
  logger: StepLogger
  services: WorkflowStepServices
}

interface WorkflowStepDefinition<TConfig = Record<string, unknown>> {
  type: string
  handler: WorkflowStepHandler<TConfig>
}
```

**`validateConfig`** — Each step validates and narrows its own config from the raw YAML. This runs before `execute`, during the validation phase. Type-safe config per step type — `code-extraction` gets `CodeExtractionConfig`, `eventcatalog-import` gets `EventCatalogImportConfig`, etc.

**`execute`** — Receives the typed config, builder, logger, and fixed runtime services. Performs step work. Returns void on success, throws on failure.

The runtime is decoupled from concrete step implementations. It resolves step handlers by type name from the registry, calls `validateConfig()` for each step, then executes them in order. The step contract is exported from `riviere-workflow` so future extension can depend on the same seam.

### 3.3 Builder Creation and Workflow Compatibility Rules

The builder requires `sources` and `domains` at construction (`RiviereBuilder.new()`). The workflow therefore creates the builder eagerly at startup from its top-level graph definition.

**How it works:**

1. Load workflow YAML
2. Validate workflow structure
3. Validate each step config
4. Create `RiviereBuilder.new({ name, description, sources, domains }, output)`
5. Execute steps sequentially with that concrete builder

**Why the workflow owns this data:** `sources` and `domains` are graph-wide builder inputs, not step-local behavior. Modules remain step-local because the builder does not require a global module registry.

**Compatibility rule:** Step configs may still declare sources and domains for standalone direct usage. During workflow execution:

- any domain referenced by a step config must exist in the workflow's `domains`
- source identity is the `repository` field from `SourceInfo`; any source declared by a step config must match a workflow source with the same `repository`
- if both workflow and step config specify `commit` for the same source, the values must match exactly
- if a step config includes metadata for a workflow-declared domain, `description` and `systemType` must match exactly

**`addDomain()` becomes idempotent:** If a domain with the same name already exists, the call is a no-op (no error). Same for `addSource()`.

### 3.4 Built-in Step Types

#### `code-extraction`

Runs the Phase 10/11/12 extraction pipeline against a TypeScript codebase.

```yaml
- name: extract-orders
  type: code-extraction
  config: ./orders/riviere-config.yaml # Extraction config (Phase 11 format)
```

The extraction config remains the source of truth for extraction behavior — detection rules, metadata extraction, connection patterns, strictness, and modules. Workflow usage must behave the same as direct CLI usage with the same extraction config.

The extraction config may still declare sources and domains for standalone usage. In a workflow run, those declarations are validated against the workflow's top-level `sources` and `domains`.

#### `eventcatalog-import`

Imports components and connections from an EventCatalog instance. Uses `@eventcatalog/sdk` to read events, services, and producer/consumer relationships.

```yaml
- name: import-events
  type: eventcatalog-import
  config: ./specs/eventcatalog-import.yaml
```

```yaml
# eventcatalog-import.yaml
source: ./eventcatalog
mappings: ./eventcatalog-mappings.yaml
allow-unmapped: false
```

**Convention-based defaults:**

| EventCatalog Concept   | Default Riviere Mapping                                          |
| ---------------------- | ---------------------------------------------------------------- |
| Domain                 | Domain (same name)                                               |
| Service                | UseCase component with the same canonical name within its domain |
| Event                  | Event component (`addEvent()`)                                   |
| Service produces Event | Link (service → event, type: async)                              |
| Service consumes Event | EventHandler component + link (event → handler, type: async)     |

**Mappings file — overrides only:**

```yaml
# eventcatalog-mappings.yaml
domains:
  OrdersDomain: orders # EventCatalog domain name → Riviere domain name

services:
  OrdersService:
    type: UseCase
    domain: orders # Override which Riviere domain this maps to
    module: checkout # Override module name (default: kebab-case service name)
    name: PlaceOrder # Canonical Riviere component name

events:
  OrderCreated:
    name: OrderPlaced # Override Riviere event name (default: same name)
```

EventCatalog producer/consumer relationships must resolve to canonical Riviere component identities before links are created. If a mapping is missing and convention-based defaults can't resolve that identity (for example, a service has no domain), strict mode fails with a clear error. Lenient mode skips the unmapped item and logs a warning.

#### `asyncapi-import`

Imports components and connections from an AsyncAPI spec. Uses `@asyncapi/parser`. Phase 13 targets AsyncAPI v3 only.

```yaml
- name: import-broker
  type: asyncapi-import
  config: ./specs/asyncapi-import.yaml
```

```yaml
# asyncapi-import.yaml
source: ./broker/asyncapi.yaml
mappings: ./asyncapi-mappings.yaml
allow-unmapped: false
```

**Convention-based defaults:**

| AsyncAPI Concept    | Default Riviere Mapping                                      |
| ------------------- | ------------------------------------------------------------ |
| Message             | Event component (message name → event name)                  |
| Operation (send)    | Link (sender → event, type: async)                           |
| Operation (receive) | EventHandler component + link (event → handler, type: async) |
| Channel             | Not mapped directly — channels are infrastructure            |

**Mappings file — same structure as EventCatalog mappings:**

```yaml
# asyncapi-mappings.yaml
messages:
  OrderPlacedMessage:
    domain: orders
    module: checkout
    name: OrderPlaced # Riviere event name

operations:
  processOrder:
    type: UseCase
    domain: orders
    module: checkout
    name: ProcessOrder
```

AsyncAPI operations must resolve to canonical Riviere component identities before publisher/subscriber links are created. Phase 13 supports AsyncAPI v3 publish/subscribe only. Request/reply patterns are out of scope and fail validation with an unsupported-pattern error.

#### `ai-extract`

Discovers components and connections that deterministic extraction missed. Analyzes source code directories, inspects the builder to see what's already been extracted, and identifies gaps.

```yaml
# ai-extract.yaml
sources:
  - ./orders/src
  - ./shipping/src

selection:
  from:
    - uncertain-links
    - missing-events
    - missing-event-handlers
    - missing-use-cases
  component-types: [Event, EventHandler, UseCase, DomainOp]

outputs:
  add-components: true
  add-links: true

context:
  exclude:
    - '**/*.spec.ts'
    - '**/dist/**'
  max-files-per-batch: 20
  max-batches: 5

confidence-threshold: 0.8
```

Components and links added by `ai-extract` carry metadata indicating they are AI-discovered with a confidence score. This metadata persists in the output graph so consumers can distinguish AI-discovered from deterministically-extracted.

`ai-extract` is gap-driven, not whole-repo discovery. It operates on bounded sources, bounded gap categories, bounded component types, and bounded context windows.

**Enums over strings:** `selection.from` is an enum of supported gap categories. `selection.component-types` is an enum of supported Riviere component types.

**AI runtime boundary:** The step uses `context.services.ai`. Provider choice is runtime configuration, not step config. If `services.ai` is undefined, the step throws a clear runtime error.

#### `ai-enrich`

Fills missing metadata fields on components already in the builder. Targets `_missing` fields from lenient mode extraction and any components lacking optional metadata.

```yaml
# ai-enrich.yaml
sources:
  - ./orders/src
  - ./shipping/src

selection:
  component-types: [Event, EventHandler, API, DomainOp, UI, UseCase]
  missing-fields-only: true

fields:
  - eventName
  - subscribedEvents
  - operationName
  - route
  - httpMethod
  - path

context:
  exclude:
    - '**/*.spec.ts'
    - '**/dist/**'
  max-files-per-component: 10

confidence-threshold: 0.8
```

Reads source code context for each component with missing metadata and proposes values. Like `ai-extract`, enrichments carry AI-confidence metadata.

`ai-enrich` can only touch existing builder components. MVP supports `missing-fields-only: true` only.

**Enums over strings:** `selection.component-types` is an enum of supported component types. `fields` is an enum of allowed enrichable fields.

**AI runtime boundary:** Same runtime model as `ai-extract` — provider-neutral, accessed via `context.services.ai`, with a clear runtime failure if no AI service is configured.

#### `schema-validate`

Validates the graph by calling `builder.build()`. Reports validation errors. This should typically be the final step. Validation is always strict — no lenient mode.

```yaml
- name: validate
  type: schema-validate
```

On failure: logs validation errors from `BuildValidationError` and the workflow exits with code 1.

`schema-validate` is an optional explicit checkpoint. Final workflow output still always validates by calling `builder.build()`, even if this step is omitted.

### 3.5 Builder Upsert Capability

`RiviereBuilder` gains upsert capability for multi-source graph construction. When a step adds a component that already exists (same ID), the builder enriches the existing component with new metadata rather than throwing `DuplicateComponentError`.

This is a builder-level capability, not workflow-specific. Multi-source graph construction is a core use case.

**Identity rule:** Upsert is merge-after-identity, not identity resolution. Cross-source identity is normalized in step-local mapping/config logic before the builder sees the component.

```text
EventCatalog event:  OrderCreated
AsyncAPI message:    OrderPlacedMessage
Mapping files normalize both to:
  domain: orders
  module: checkout
  type: Event
  name: OrderPlaced

=> both resolve to the same canonical component ID
=> builder upsert merges them
```

Phase 13 does **not** do fuzzy matching between source systems.

**Precedence rule:** For scalar conflicts on the same canonical component, merge precedence follows workflow step order. Teams should order workflows according to §2.2 so higher-priority sources run earlier.

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
2. **Semantic:** Each step handler's `validateConfig()` runs against its config (extraction configs validate against schema, mappings files parse correctly, AI configs validate enums/limits, step-declared domains and sources are compatible with the workflow)

Does not execute steps.

### 3.7 Architecture Fit

Phase 13 introduces a new `riviere-workflow` package.

```text
riviere-cli
  -> riviere-workflow

riviere-workflow
  -> riviere-builder
  -> riviere-extract-config
  -> riviere-extract-ts
```

**Responsibilities:**

- `riviere-cli` — CLI entrypoints (`workflow run`, `workflow init`, `workflow validate`)
- `riviere-workflow` — workflow executor, step registry, exported step contract, built-in steps, AI service contract and initial adapters
- `riviere-builder` — graph construction, idempotent `addSource()` / `addDomain()`, and `upsertComponent()`
- `riviere-extract-config` — workflow and step config schemas/types
- `riviere-extract-ts` — deterministic extraction reused by `code-extraction`

**Extension direction:** Phase 13 exports the step contract now but does not implement user plugin loading. Built-in steps are resolved through the same registry that future external steps will use.

### 3.8 Demo App Validation

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
│   ├── eventcatalog-import.yaml
│   ├── asyncapi-import.yaml
│   ├── eventcatalog-mappings.yaml
│   └── asyncapi-mappings.yaml
├── steps/
│   ├── ai-extract.yaml
│   └── ai-enrich.yaml
├── riviere-workflow.yaml
└── tests/
    ├── ground-truth.json
    └── workflow-transitions/
        ├── 00-builder-start.json
        ├── 01-after-eventcatalog.json
        ├── 02-after-asyncapi.json
        ├── 03-after-orders-code.json
        ├── 04-after-shipping-code.json
        ├── 05-after-ai-extract.json
        ├── 06-after-ai-enrich.json
        └── 07-after-validate.json
```

#### 3.8.1 Ecommerce Demo App Is the First Workflow Customer

`ecommerce-demo-app` is not just a test fixture. It is the first real workflow customer and must use the same workflow concepts that a product user would use in a real repository.

The demo app workflow exercises the full built-in workflow surface in one ordered run:

```yaml
# ecommerce-demo-app/riviere-workflow.yaml
name: ecommerce-architecture
description: Full architecture graph for the ecommerce demo app
output: ./.riviere/ecommerce-architecture.json

sources:
  - repository: ecommerce-demo-app

domains:
  orders:
    description: Order lifecycle and checkout
    systemType: domain
  shipping:
    description: Shipment orchestration
    systemType: domain

steps:
  - name: import-eventcatalog
    type: eventcatalog-import
    config: ./specs/eventcatalog-import.yaml

  - name: import-asyncapi
    type: asyncapi-import
    config: ./specs/asyncapi-import.yaml

  - name: extract-orders
    type: code-extraction
    config: ./orders-domain/riviere-config.yaml

  - name: extract-shipping
    type: code-extraction
    config: ./shipping-domain/riviere-config.yaml

  - name: discover-gaps
    type: ai-extract
    config: ./steps/ai-extract.yaml

  - name: enrich-metadata
    type: ai-enrich
    config: ./steps/ai-enrich.yaml

  - name: validate
    type: schema-validate
```

This workflow is the reference ordering for Phase 13:

- specs first so spec-owned scalar values win
- code second so code fills components and links the specs do not describe
- AI last so AI only fills remaining gaps instead of competing with deterministic sources

**Representative demo inputs:**

```yaml
# specs/eventcatalog-import.yaml
source: ./specs/eventcatalog
mappings: ./specs/eventcatalog-mappings.yaml
allow-unmapped: false
```

```yaml
# specs/asyncapi-import.yaml
source: ./specs/asyncapi.yaml
mappings: ./specs/asyncapi-mappings.yaml
allow-unmapped: false
```

```yaml
# steps/ai-extract.yaml
sources:
  - ./orders-domain/src
  - ./shipping-domain/src

selection:
  from:
    - uncertain-links
    - missing-events
    - missing-event-handlers
    - missing-use-cases
  component-types: [Event, EventHandler, UseCase, DomainOp]

outputs:
  add-components: true
  add-links: true

context:
  exclude:
    - '**/*.spec.ts'
    - '**/dist/**'
  max-files-per-batch: 20
  max-batches: 5

confidence-threshold: 0.8
```

```yaml
# steps/ai-enrich.yaml
sources:
  - ./orders-domain/src
  - ./shipping-domain/src

selection:
  component-types: [Event, EventHandler, API, DomainOp, UI, UseCase]
  missing-fields-only: true

fields:
  - eventName
  - subscribedEvents
  - operationName
  - route
  - httpMethod
  - path

context:
  exclude:
    - '**/*.spec.ts'
    - '**/dist/**'
  max-files-per-component: 10

confidence-threshold: 0.8
```

#### 3.8.2 Demo App Workflow Data Transitions

The demo app workflow must be specified step-by-step so implementation and validation can compare actual behavior against a known transition model.

##### Initial state before step execution

Loaded inputs:

- `riviere-workflow.yaml`
- workflow `sources` and `domains`

Builder state after startup:

```text
metadata:
  name: ecommerce-architecture
  description: Full architecture graph for the ecommerce demo app
  sources:
    - repository: ecommerce-demo-app
  domains:
    - orders
    - shipping

components: []
links: []
externalLinks: []
```

##### Step 1 — `import-eventcatalog`

Loads:

- `./specs/eventcatalog`
- `./specs/eventcatalog-mappings.yaml`

Reads:

- EventCatalog domains
- EventCatalog services
- EventCatalog events
- producer/consumer relationships

Modifies builder by:

- upserting canonical service-backed components from EventCatalog services
- adding canonical Event components such as `OrderPlaced`
- adding EventHandler components for consumers where required by the mapping model
- adding async links from producers to events and events to handlers

Representative transition:

```text
before:
  components: []
  links: []

after:
  components include:
    - orders/PlaceOrder (UseCase)
    - shipping/ProcessShipment (UseCase)
    - orders/OrderPlaced (Event)
    - shipping/OrderPlacedHandler (EventHandler)

  links include:
    - PlaceOrder -> OrderPlaced (async)
    - OrderPlaced -> OrderPlacedHandler (async)
```

##### Step 2 — `import-asyncapi`

Loads:

- `./specs/asyncapi.yaml`
- `./specs/asyncapi-mappings.yaml`

Reads:

- AsyncAPI messages
- AsyncAPI publish operations
- AsyncAPI receive operations

Modifies builder by:

- upserting canonical Event components for broker messages
- upserting publisher/subscriber-side canonical components for operations
- adding async links where AsyncAPI describes message flow
- enriching existing spec-derived components where AsyncAPI contributes additional metadata

Representative transition:

```text
before:
  EventCatalog already created OrderPlaced and related async links

after:
  AsyncAPI resolves OrderPlacedMessage -> OrderPlaced
  AsyncAPI resolves processOrder -> ProcessOrder

  resulting builder effect:
    - no duplicate OrderPlaced event component
    - existing canonical event is enriched via upsert
    - additional broker-described async links are added if missing
```

##### Step 3 — `extract-orders`

Loads:

- `./orders-domain/riviere-config.yaml`
- TypeScript files matched by that config

Reads:

- deterministic component extraction rules
- deterministic metadata extraction rules
- deterministic connection rules and configurable connection patterns

Modifies builder by:

- adding orders-domain code components not already represented by specs
- enriching spec-created canonical components with code-derived metadata where those fields are still unset
- adding deterministic sync and async links discovered from the orders codebase

Representative transition:

```text
before:
  PlaceOrder and OrderPlaced already exist from specs

after:
  builder gains orders code-owned components such as:
    - API entry points
    - DomainOps
    - internal UseCases not represented in specs

  builder also gains:
    - sync links from orders APIs to orders use cases
    - code-derived metadata on existing PlaceOrder / OrderPlaced where spec data was absent
```

##### Step 4 — `extract-shipping`

Loads:

- `./shipping-domain/riviere-config.yaml`
- TypeScript files matched by that config

Modifies builder by:

- adding shipping-domain code components not already represented by specs
- enriching canonical shipping components already introduced by specs
- adding deterministic shipping-domain links

Representative transition:

```text
before:
  shipping async relationships already exist from spec imports

after:
  builder gains shipping code-owned components and sync links
  spec-created shipping components remain canonical; code fills missing structure around them
```

##### Step 5 — `discover-gaps`

Loads:

- `./steps/ai-extract.yaml`
- bounded source batches from `orders-domain/src` and `shipping-domain/src`
- current builder snapshot

Reads:

- only files allowed by the AI extract config
- only gap categories listed in `selection.from`

Modifies builder by:

- adding high-confidence missing components
- adding high-confidence missing links
- attaching AI provenance/confidence metadata to AI-discovered graph elements

Representative transition:

```text
before:
  deterministic extraction leaves known deliberate gaps

after:
  builder gains only gap-targeted additions, for example:
    - an event inferred from dynamic config lookup
    - a missing handler link hidden behind runtime wiring

  each AI-added component/link carries provenance metadata
```

##### Step 6 — `enrich-metadata`

Loads:

- `./steps/ai-enrich.yaml`
- bounded source files near components with missing fields
- current builder snapshot filtered to `missing-fields-only: true`

Modifies builder by:

- filling only the configured enrichable fields
- leaving already-populated fields unchanged
- attaching AI provenance/confidence metadata to enriched fields

Representative transition:

```text
before:
  component fields may still contain gaps such as:
    - missing subscribedEvents
    - missing operationName
    - missing route/path details

after:
  those fields are filled when AI confidence passes threshold
  non-missing fields are preserved
```

##### Step 7 — `validate`

Loads:

- no extra config beyond the step declaration

Reads:

- current builder state only

Modifies builder by:

- no graph mutation

Validation effect:

```text
builder.build()
  -> validates schema and graph invariants
  -> fails fast if graph is invalid
  -> leaves builder state unchanged
```

##### Final output write

After all steps succeed, the workflow writes:

```text
./.riviere/ecommerce-architecture.json
```

The written graph must contain:

- spec-derived canonical events and async relationships
- code-derived components and internal links from both domains
- AI-discovered additions for the deliberate demo gaps
- AI-enriched metadata where allowed by config

This final artifact is compared against `tests/ground-truth.json` for exact component ID and link tuple coverage.

#### 3.8.3 Demo App Validation Use

The ecommerce demo app must validate three things at once:

1. **Product realism** — a user can understand the workflow YAML and step configs as a believable first customer setup
2. **Execution correctness** — each step changes builder state in the expected direction and order
3. **Regression safety** — the full workflow remains idempotent and comparable to a fixed ground truth

To make the step-by-step behavior testable, the demo app also maintains per-step transition fixtures. Each fixture captures the expected builder graph after one step completes, before the next step begins. Implementation can then verify:

- workflow startup builder creation
- each step's additive or enriching effect on the graph
- that no later step accidentally mutates earlier deterministic data outside the defined merge rules
- that `schema-validate` is non-mutating

**Graph comparison semantics:**

- Components compared by ID (exact match on full set — no extra, no missing)
- Links compared by (source, target, type) tuple (exact match on full set)
- Metadata differences logged for debugging but not part of pass/fail
- AI-discovered components included in ground truth with expected confidence thresholds

**Workflow idempotency:** Running the same workflow twice with unchanged inputs must produce identical output. Validated by running twice and diffing.

---

## 4. What We're NOT Building

| Exclusion                                           | Rationale                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User plugin loading**                             | Phase 13 exports the step contract and uses a registry-based runtime, but does not load user-created plugin packages yet. Built-in steps only in this phase. |
| **Parallel step execution**                         | Steps run sequentially. Parallelization is an optimization for later if needed.                                                                              |
| **TypeScript workflow definitions**                 | YAML + JSON Schema for now. TypeScript config files are a future option for teams wanting type safety and composability.                                     |
| **Workflow state / caching between runs**           | Each run is stateless — produces a complete graph from scratch. Incremental extraction deferred.                                                             |
| **OpenAPI, GraphQL, Protobuf, Backstage importers** | Phase 13 includes EventCatalog and AsyncAPI (provide connection data). Component-only importers are lower value, deferred.                                   |
| **Cross-repo linking**                              | Phase 14 scope.                                                                                                                                              |
| **Cross-repo workflow orchestration**               | Phase 14 will define how multi-repo graphs are built.                                                                                                        |
| **Generic workflow engine features**                | No conditionals, loops, branching, retry policies, continue-on-error, or DAG execution. Sequential steps only.                                               |
| **Workflow composition**                            | Workflows cannot reference or import other workflows.                                                                                                        |
| **Workflow versioning / migration**                 | No version compatibility checks or migration tooling for workflow format changes.                                                                            |
| **Step rollback / partial success**                 | If a step fails, the workflow aborts entirely. No partial output, no undo.                                                                                   |
| **Multi-output workflows**                          | One workflow produces one output file. Multiple formats or artifacts require separate workflows.                                                             |
| **Step timeout / resource limits**                  | No per-step time or memory limits.                                                                                                                           |
| **Workflow execution history / audit**              | No tracking of when workflows ran or what changed between runs.                                                                                              |
| **Provider-specific AI runtime assumptions**        | AI-backed steps depend on a provider-neutral runtime service contract. No vendor-specific workflow semantics in Phase 13.                                    |

---

## 5. Success Criteria

| #   | Criterion                                                                                                                                                   | Verification                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Workflow engine executes steps sequentially, passing shared builder between steps                                                                           | Unit tests for engine with mock step handlers                                                                             |
| 2   | Workflow creates the builder eagerly from workflow `name`, `description`, `sources`, `domains`, and `output` before executing steps                         | Integration test for workflow startup with multiple built-in step types                                                   |
| 3   | `eventcatalog-import` maps EventCatalog data to Riviere components and links via builder, using convention-based defaults                                   | Integration test against demo app EventCatalog                                                                            |
| 4   | `asyncapi-import` maps AsyncAPI v3 spec to Riviere components and links via builder                                                                         | Integration test against demo app AsyncAPI spec                                                                           |
| 5   | Builder `upsertComponent()` handles duplicate components across sources (enriches existing, deduplicates links, idempotent domain/source addition)          | Unit tests in riviere-builder covering scalar merge, array union, required field mismatch                                 |
| 6   | `ai-extract` discovers components/connections that deterministic extraction missed, with confidence metadata                                                | Integration test against demo app deliberate gaps                                                                         |
| 7   | `ai-enrich` fills missing metadata fields with confidence metadata                                                                                          | Integration test against demo app components with `_missing` fields                                                       |
| 8   | `riviere workflow run` produces valid graph from demo app workflow matching ground truth                                                                    | End-to-end test: zero false positives, zero false negatives on component IDs and link (source, target, type) tuples       |
| 9   | `riviere workflow init` produces valid workflow YAML and step configs                                                                                       | Init creates files, `workflow validate` passes, `workflow run` succeeds                                                   |
| 10  | `riviere workflow validate` catches invalid workflow files, missing config references, incompatible step-declared domains/sources, and invalid step configs | Unit tests for structural and semantic validation                                                                         |
| 11  | Workflow JSON Schema validates workflow file structure                                                                                                      | Schema published in `riviere-extract-config`                                                                              |
| 12  | `riviere-workflow` exports the step contract and resolves built-in steps through a registry rather than hardcoded switch logic                              | Unit tests for step registry + dependency-cruiser rule enforcement                                                        |
| 13  | Workflow runs are idempotent: same inputs produce identical output                                                                                          | E2E test: run twice, diff outputs, assert zero changes                                                                    |
| 14  | AI step configs validate bounded enum-based selection and field lists rather than free-form strings                                                         | Schema validation tests in `riviere-extract-config`                                                                       |
| 15  | Canonical identity normalization happens in step config/mappings, not in the workflow runtime                                                               | Integration test: differently named external records merge only when mappings normalize them to the same Riviere identity |
| 16  | `schema-validate` works as an optional explicit checkpoint while final output still always validates                                                        | Integration test with and without `schema-validate` step                                                                  |
| 17  | Step summary output shows per-step duration and total workflow duration                                                                                     | Visible in `riviere workflow run` output                                                                                  |
| 18  | The documented ecommerce demo app workflow transitions are verified after each step, not only at final output                                               | Integration test compares builder state after each step to `tests/workflow-transitions/*.json` fixtures                   |

---

## 6. Open Questions

1. **EventCatalog ingestion approach**

   **Option A — SDK-first**

   ```text
   workflow step -> @eventcatalog/sdk -> services/events/domains/relationships
   ```

   **Option B — file-first fallback**

   ```text
   workflow step -> EventCatalog content directory -> frontmatter + MDX parsing
   ```

   **Recommendation:** Start with Option A. If the SDK does not expose a required relationship, fall back only for the missing data.

2. **AsyncAPI scope boundary**

   **Option A — publish/subscribe only**

   ```text
   send(message)    -> component -> event
   receive(message) -> event -> handler
   request/reply    -> unsupported in Phase 13
   ```

   **Option B — model request/reply too**

   ```text
   request channel -> API-like component -> downstream handler
   ```

   **Recommendation:** Option A. Keep Phase 13 to AsyncAPI v3 publish/subscribe semantics only.

3. **AI provider setup**

   **Option A — provider configured by the runtime environment**

   ```text
   workflow runtime constructs WorkflowStepServices.ai
   ai-* steps consume that service if present
   ```

   **Option B — provider declared in step config**

   ```yaml
   provider: openai
   ```

   **Recommendation:** Option A. Provider choice is runtime environment, not step behavior.

---

## 7. Dependencies

**Depends on:**

- Phase 12 (Connection Detection) — `code-extraction` step runs the Phase 10/11/12 pipeline. Requires Phase 12 M1 (Core Extraction) and M4 (Configurable Layer) to be complete. Assumes stable extraction config schema and `EnrichedComponent` interface.

**Blocks:**

- Phase 14 (Cross-Repo Linking) — Workflows enable multi-repo extraction

---

## 8. Research References

### Integration SDKs

| Tool                                                 | SDK/Package       | License    | Data Available                                 |
| ---------------------------------------------------- | ----------------- | ---------- | ---------------------------------------------- |
| [EventCatalog](https://github.com/event-catalog/sdk) | @eventcatalog/sdk | MIT        | Events, services, producers/consumers, domains |
| [AsyncAPI](https://www.asyncapi.com/)                | @asyncapi/parser  | Apache 2.0 | Channels, messages, operations, schemas        |

### AI Integration

- Provider-neutral AI service contract consumed by `ai-extract` and `ai-enrich`
- Initial provider adapters can live inside `riviere-workflow`
- Prompt strategies for bounded code analysis and confidence scoring

---

## 9. Terminology

| Term                       | Definition                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Workflow**               | A YAML definition specifying a sequence of steps that produce a complete Riviere graph. The primary interface for using Riviere.                                         |
| **Step**                   | A single unit of work in a workflow. Receives the builder, performs extraction/import/analysis, adds to the graph. Implements `WorkflowStepHandler`.                     |
| **Step Type**              | A category of step with specific behavior: `code-extraction`, `eventcatalog-import`, `asyncapi-import`, `ai-extract`, `ai-enrich`, `schema-validate`.                    |
| **Step Config**            | Configuration specific to a step type, stored in a separate file referenced by the workflow. Not part of the workflow definition.                                        |
| **Workflow Step Services** | Fixed runtime services passed to every step through `StepContext.services`. A step may use the services it needs and throws if a required service is undefined.          |
| **Mappings File**          | Configuration defining how external data models (EventCatalog, AsyncAPI) map to Riviere concepts. Convention-based defaults with explicit overrides.                     |
| **Canonical Identity**     | The final Riviere component identity produced by a step's mapping/config logic before the builder sees the component. Upsert happens after this identity is established. |
| **Upsert**                 | Builder capability to add-or-enrich a component. If the component ID already exists, merge metadata. If not, create it. Enables multi-source graph construction.         |
| **Workflow Init**          | Interactive CLI command (`riviere workflow init`) that creates a workflow definition and all step configs. The setup process for new workflows.                          |
