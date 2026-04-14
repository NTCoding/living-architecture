# PRD: Phase 13 — Extraction Workflows

**Status:** Approved

**Approval note:** Draft and planning work are complete. Architecture review has closed the package-boundary, adapter-isolation, and builder/workflow-seam questions. This PRD is ready for implementation.

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

**Workflows are the primary interface for users who need more than one source of truth.** For a single TypeScript codebase with no external specs and no AI, `riviere extract --config <file>` is still the shortest path. Workflows become valuable — and become the standard — as soon as a user has any combination of: multiple codebases, external specs to import, or AI-driven gap filling. A typical user who starts with `riviere extract` grows into workflows by wrapping their existing extraction config in a one-step workflow (see §3.6 upgrade path) and adding steps as new sources appear.

**Who uses workflows:** Anyone composing more than one source of architecture truth. Individual developers aggregating several domain codebases; platform teams wiring spec imports alongside code extraction; CI pipelines. Users with a single-codebase happy path stay on `riviere extract`.

---

## 2. Design Principles

### 2.1 Workflows Are Riviere Workflows

This is not a generic workflow engine. Workflows are purpose-built for Riviere extraction. Every step receives the workflow-owned builder facade over `RiviereBuilder` and calls its API to construct the graph. The builder remains the single source of truth for graph construction — ID generation, validation, deduplication all go through the builder surface.

**Trade-off:** We sacrifice generality for simplicity and correctness. A generic engine would require intermediate representations, merge logic, and format translation. Builder-centric workflows get all of that for free from the existing builder infrastructure.

### 2.2 Sources of Truth First

**If a source of truth exists, use it.** Don't analyze code when a spec already describes the architecture.

| Priority (on scalar merge) | Source                | Example                            | Where it runs in the workflow                  |
| -------------------------- | --------------------- | ---------------------------------- | ---------------------------------------------- |
| 1 — highest                | Existing specs        | AsyncAPI, EventCatalog             | Last among deterministic steps                 |
| 2                          | Code with conventions | Golden Path extraction (Phase 12)  | Before spec imports                            |
| 3                          | Code with patterns    | Configurable extraction (Phase 12) | Before spec imports                            |
| 4 — additive only          | AI discovery          | Fill gaps, enrich metadata         | After all deterministic steps, non-overwriting |

**Ordering doctrine — "last-wins, highest-priority runs last":** Scalar-field merge semantics in the builder are last-wins (§3.5). Workflow step order therefore reads bottom-up the priority table: lower-priority deterministic sources run first so higher-priority deterministic sources can overwrite them. Spec imports (priority 1) run last among deterministic steps; their scalar values become authoritative.

**AI is the exception:** AI steps (`ai-extract`, `ai-enrich`) are **additive-only**. They never overwrite an already-set scalar field. They run after all deterministic steps so they can see the merged graph and target gaps, but because they are additive-only they don't need to be ordered for priority — they can't win scalar conflicts by construction.

Teams that maintain AsyncAPI specs for their events shouldn't need to configure event extraction rules — the workflow imports the spec directly, and the spec import (running after any code extraction) overwrites anything code may have put in the same field.

### 2.3 Steps Own Their Config

Config files are the source of truth for step behavior. The workflow is the glue.

The workflow file defines:

- graph-wide builder inputs (`name`, `description`, `output`, `sources`, `domains`)
- step execution order
- which config file each step uses

Each step config defines everything about how that capability behaves — extraction rules, mappings, modules, AI selection rules, and other graph-affecting behavior.

**Rationale:** A user must get the same behavior from direct CLI usage and workflow usage. If a rule belongs to the capability itself, it belongs in the capability config. The workflow composes those capabilities into one graph build.

### 2.4 CI-First

Workflows must run in CI without human intervention. `riviere workflow run ./riviere-workflow.yaml` is a single command that produces a complete graph. No interactive prompts during execution. Setup is interactive (`riviere workflow init`); execution is fully automated.

### 2.5 Incremental Learning

When a user refines a mapping or otherwise updates a step config after reviewing workflow output, that correction lives in config files — not in workflow runtime memory. Future runs use the updated configs. Phase 13 does not include an automated AI review-and-accept loop.

### 2.6 Strict Schemas, No Workarounds

Every schema introduced or extended by Phase 13 (workflow YAML, step configs, mappings files, builder inputs) must be strict by default:

- **Mandatory string fields** have `minLength: 1` (or equivalent). Empty strings are never valid input.
- **Optional fields** are omitted when unset, not set to `""`. Schema still rejects `""` if the key is present.
- **Enums over free-form strings** wherever the set of valid values is known (e.g. `selection.from`, `selection.component-types`, `fields`, `systemType`).
- **No "tolerant merge" special-cases** for workaround values. Invalid input fails at the schema boundary, not in downstream merge/consumer code.

This is the same strictness convention `riviere-schema` already applies (see `packages/riviere-schema/src/minlength-*.spec.ts`); Phase 13 extends it across every new schema it introduces.

### 2.7 Registry-Based Runtime, Built-In Steps First

Phase 13 introduces a dedicated `riviere-workflow` runtime package. The runtime resolves steps through a registry and executes them sequentially against a shared builder.

Phase 13 ships built-in step types only. User plugin loading is out of scope, but the runtime must be structured so future extension can add new step types without major rework.

**Exported extension seam:** `riviere-workflow` exports the step contract now. Built-in steps and future custom steps use the same interfaces.

**Steps are isolated.** A step can access only:

- its own validated config
- the shared builder
- logger
- the explicit workflow diagnostics contract (view + emit/report/resolve operations)
- fixed runtime services passed in `StepContext`

No step can read another step's config or mutate another step's private state. Cross-step diagnostics are explicit runtime state exposed only through the diagnostics contract — not hidden coupling.

**Adapter isolation rule:** Built-in step handlers may depend on workflow-owned interfaces and adapters only. Direct imports of `@eventcatalog/sdk`, `@asyncapi/parser`, or Node `child_process` are confined to `riviere-workflow`'s `platform/infra/external-clients` layer. Step handlers and registry/runtime code depend on those interfaces, not on vendor SDK/parser/process APIs directly. This keeps orchestration code thin and matches ADR-002's external-client boundary.

---

## 3. What We're Building

### 3.1 Workflow Definition Format

YAML with JSON Schema validation. Consistent with extraction config (Phase 11). Workflow JSON Schema lives in `riviere-extract-config` alongside the existing extraction config schema.

```yaml
apiVersion: v1
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
  - name: extract-orders
    type: code-extraction
    config: ./orders/riviere-config.yaml

  - name: extract-shipping
    type: code-extraction
    config: ./shipping/riviere-config.yaml

  - name: import-events
    type: eventcatalog-import
    config: ./specs/eventcatalog-import.yaml

  - name: import-broker
    type: asyncapi-import
    config: ./specs/asyncapi-import.yaml

  - name: discover-gaps
    type: ai-extract
    config: ./steps/ai-extract.yaml

  - name: enrich-metadata
    type: ai-enrich
    config: ./steps/ai-enrich.yaml

  - name: validate
    type: schema-validate
```

**Execution model:** Steps run sequentially, top to bottom. All steps share the same workflow-owned builder facade (passed by reference) over `RiviereBuilder`. Builder state accumulates across steps. If a step throws, the workflow aborts, no final graph is written, and the structured workflow log remains available for debugging.

**Step order is semantic (last-wins).** When multiple steps set the same scalar field on the same canonical component, **the later step wins**. Recommended order follows the priority doctrine in §2.2:

1. `code-extraction` steps first (lowest priority — overwritten by higher-priority sources)
2. `eventcatalog-import` / `asyncapi-import` next (highest deterministic priority — authoritative scalar values)
3. `ai-extract` / `ai-enrich` last (additive-only — never overwrite existing scalars)
4. `schema-validate` optional terminal step

AI steps must run after deterministic steps because they read current builder state to find gaps, and they never participate in scalar merge (they only add new components/links or fill strictly-unset fields).

**Workflow schema:** JSON Schema validates the workflow file structure (`apiVersion`, `name`, `output`, `sources`, `domains`, `steps[].name`, `steps[].type`, and `steps[].config` for steps that require config). Step-specific behavior is validated by each step handler's own `validateConfig()` method.

**`output` is required (no default).** Workflow files must specify `output` explicitly; there is no implicit `./.riviere/architecture.json`. Missing or empty `output` fails structural validation. Rationale: silent defaults lead to "where did my graph go?" confusion, especially across workflow files in different subdirectories (each resolves relative to its own file per §3.1 path rules). Being explicit costs one line and removes the ambiguity.

**Step name uniqueness.** `steps[].name` values must be unique within a workflow. Structural validation rejects duplicates with a clear message: `duplicate step name '<name>' at positions N and M — every step in a workflow must have a unique name`. Step names are used for logs, timing summaries, and (in future phases) any selector syntax — ambiguous names produce unusable diagnostics. Names match the pattern `^[a-z0-9-]+$` (lowercase, digits, hyphens only, `minLength: 1`) to keep them safe as log-line tokens and future CLI arguments.

**Shared enum references.** Every enum field in the workflow schema that exists in `riviere-schema` is referenced via JSON Schema `$ref` rather than redeclared:

- `domains.*.systemType` — `$ref`s `SystemType` from `riviere-schema` (currently `'domain' | 'bff' | 'ui' | 'other'`).
- Component-type enums in step configs (e.g. `selection.component-types`) — `$ref` the `ComponentType` enum from `riviere-schema`.
- Link-type enums in step configs — `$ref` the `LinkType` enum from `riviere-schema`.

This guarantees that when `riviere-schema` evolves (e.g. adds a new `SystemType` value), workflow-validate immediately accepts it without a separate Phase-13-schema update. Redeclaring enums is forbidden in Phase 13 schemas — if an enum lives in `riviere-schema`, it is referenced, not duplicated.

**Required `apiVersion` field.** Every workflow YAML must declare `apiVersion` as its first top-level key. Phase 13 accepts exactly `v1`. The runtime checks `apiVersion` **before** any other structural validation; an unknown or missing value fails with: `unsupported workflow apiVersion '<value>'; this CLI understands: v1`. This costs one line in every workflow file today and guarantees that a future breaking change to the workflow format gets a clear, actionable error instead of silent misbehaviour. The field is a constant string enum, no coercion. Same strictness rules as §2.6. **Only the top-level workflow file is versioned in Phase 13.** Referenced step config files and mapping files are interpreted according to the workflow `apiVersion` and the schema for the step type that references them.

**Output:** Always the result of `builder.build()` — a validated `RiviereGraph` written as JSON to the `output` path. One output file per workflow.

**Boundary rule:** Workflow YAML may declare graph-wide builder inputs. It may not override step behavior. Fields like connection patterns, `allow-incomplete`, import mappings, and AI field selection belong in step config files.

**Path resolution rule (file-relative, not cwd-relative):**

- Every path field in the workflow YAML (`output`, `steps[].config`) resolves **relative to the directory containing the workflow file**, not to the process `cwd`.
- Every path field inside a step config (e.g. `source`, `mappings`, `sources[]` in AI configs, any TypeScript `tsconfig` path in extraction configs) resolves **relative to the directory containing that step config file**, not the workflow file and not `cwd`.
- Absolute paths are accepted as-is.
- `~` is **not** expanded. Users write absolute paths explicitly if they want a home-directory reference.
- Path normalisation uses Node's `path.resolve`; YAML authors write forward-slash paths (`./specs/eventcatalog-import.yaml`) which work on Windows and POSIX identically. The runtime normalises separators on load.
- The runtime constructs every file-system-facing string by resolving against the file it came from; no step handler ever reads a raw YAML path directly. A shared utility (`resolveRelativeToConfig(configPath, rawPath)`) is exported from `riviere-workflow` and reused by all step handlers.

This rule makes `riviere workflow run ./ecommerce-demo-app/riviere-workflow.yaml` and `cd ecommerce-demo-app && riviere workflow run ./riviere-workflow.yaml` produce identical behaviour — cwd is never part of path resolution. Same applies to the nested step configs.

### 3.2 Workflow Step Interface

Every step — built-in or custom — implements this interface:

```typescript
type WorkflowServiceName = 'ai-cli'

interface AiCliRequest {
  command: string
  args: readonly string[]
  prompt: string
  timeoutSeconds: number
}

interface AiCliResult {
  stdout: string
  stderr: string
  exitCode: number
}

interface AiCliService {
  run(request: AiCliRequest): Promise<AiCliResult>
}

interface WorkflowStepHandler<TConfig = Record<string, unknown>> {
  /** Strict-typed config validator. Runs at workflow-validate time and before execute. */
  validateConfig(raw: unknown): TConfig

  /** Names of runtime prerequisites this step requires. Enforced at workflow-validate time. */
  requiredServices(): readonly WorkflowServiceName[]

  /** Executes the step. */
  execute(context: StepContext<TConfig>): Promise<void>
}

interface WorkflowStepServices {
  /** Workflow-owned process adapter. Only provided to AI steps that declare `requiredServices(): ['ai-cli']`. */
  aiCli?: AiCliService
}

type WorkflowLogEventType =
  | 'workflow-started'
  | 'workflow-completed'
  | 'workflow-failed'
  | 'step-started'
  | 'step-completed'
  | 'step-failed'
  | 'missing-field'
  | 'uncertain-link'
  | 'diagnostic-resolved'
  | 'import-skipped-record'
  | 'scalar-overwrite'
  | 'duplicate-link-skipped'
  | 'ai-addition-applied'
  | 'ai-enrichment-applied'

interface WorkflowLogEvent {
  runId: string
  timestamp: string
  eventType: WorkflowLogEventType
  step?: string
  stepType?: string
  payload: Record<string, unknown>
}

type WorkflowLogEventInput = Omit<WorkflowLogEvent, 'runId' | 'timestamp'>

type UnresolvedDiagnosticKind = 'missing-field' | 'uncertain-link'

interface UnresolvedDiagnostic {
  kind: UnresolvedDiagnosticKind
  componentId?: string
  field?: string
  source?: string
  target?: string
  linkType?: string
  reason: string
}

interface WorkflowDiagnostics {
  /** Read-only view of current-run unresolved diagnostics; used by later steps. */
  unresolved(): readonly UnresolvedDiagnostic[]
  /** Emits a structured log event into the workflow NDJSON log; runtime supplies runId/timestamp. */
  emit(event: WorkflowLogEventInput): void
  /** Adds or idempotently updates an unresolved diagnostic tracked for the current run, keyed by canonical diagnostic identity. */
  report(diagnostic: UnresolvedDiagnostic): void
  /** Marks a previously reported unresolved diagnostic as resolved. */
  resolve(diagnostic: UnresolvedDiagnostic): void
}

interface WorkflowBuilder {
  addSource(input: SourceInfo): void
  addDomain(input: DomainInput): void
  upsertUI(input: UIInput, options?: UpsertOptions): { component: UIComponent; created: boolean }
  upsertApi(input: APIInput, options?: UpsertOptions): { component: APIComponent; created: boolean }
  upsertUseCase(
    input: UseCaseInput,
    options?: UpsertOptions,
  ): { component: UseCaseComponent; created: boolean }
  upsertDomainOp(
    input: DomainOpInput,
    options?: UpsertOptions,
  ): { component: DomainOpComponent; created: boolean }
  upsertEvent(
    input: EventInput,
    options?: UpsertOptions,
  ): { component: EventComponent; created: boolean }
  upsertEventHandler(
    input: EventHandlerInput,
    options?: UpsertOptions,
  ): { component: EventHandlerComponent; created: boolean }
  upsertCustom(
    input: CustomInput,
    options?: UpsertOptions,
  ): { component: CustomComponent; created: boolean }
  link(input: LinkInput): void
  linkExternal(input: ExternalLinkInput): void
  warnings(): readonly BuilderWarning[]
  stats(): BuilderStats
  orphans(): readonly string[]
  query(): RiviereQuery
  validate(): ValidationResult
  build(): RiviereGraph
}

interface StepContext<TConfig> {
  /** Workflow-owned facade over the underlying RiviereBuilder. */
  builder: WorkflowBuilder
  config: TConfig
  logger: StepLogger
  diagnostics: WorkflowDiagnostics
  services: WorkflowStepServices
}

interface WorkflowStepDefinition<TConfig = Record<string, unknown>> {
  type: string
  handler: WorkflowStepHandler<TConfig>
}
```

**`requiredServices()` contract:**

- Built-in step handlers declare their runtime prerequisites up front. `ai-extract` and `ai-enrich` return `['ai-cli']`. All other built-in steps return `[]`.
- `workflow validate` (§3.6) calls `requiredServices()` on each step and asserts the prerequisite is satisfiable without actually invoking anything.
- For `'ai-cli'`: the step config's `command` executable field is resolved against `PATH` via Node's resolver. If it doesn't resolve, validation fails: `Step '<name>' (<type>) requires the '<command>' CLI, but it is not installed or not in PATH`. No env-var probing, no API-key checks — Riviere never touches credentials. At runtime, the workflow package provides `context.services.aiCli`, a workflow-owned adapter over `child_process.spawn`; AI step handlers never spawn processes directly.
- During `workflow run`, runtime-prerequisite checks apply only to the **effective execution plan** after flags such as `--skip-ai` / `--dry-run` are applied. `workflow validate` checks the workflow as-authored, with no flag-based omissions.

**`validateConfig`** — Each step validates and narrows its own config from the raw YAML. In `workflow validate` this runs for every step. In `workflow run` it runs only for steps in the effective execution plan after flags such as `--skip-ai` / `--dry-run` are applied. Type-safe config per step type — `code-extraction` gets `CodeExtractionConfig`, `eventcatalog-import` gets `EventCatalogImportConfig`, etc.

**`execute`** — Receives the typed config, builder, logger, workflow diagnostics, and fixed runtime services. Performs step work. Returns void on success, throws on failure.

The runtime is decoupled from concrete step implementations. It resolves step handlers by type name from the registry, derives the effective execution plan for the current mode, validates the active steps, then executes them in order. The step contract is exported from `riviere-workflow` so future extension can depend on the same seam.

`WorkflowBuilder` is a workflow-owned facade over the underlying `RiviereBuilder`; steps do **not** receive the raw builder directly. The underlying `RiviereBuilder` remains graph-only and workflow-unaware. The facade forwards graph construction/query calls, layers workflow-only diagnostics/log reconciliation on top, and exposes workflow-level `validate()` / `build()` methods that compose the underlying builder result with the workflow diagnostics store. This keeps graph semantics in `riviere-builder` while keeping workflow-specific incomplete-state handling in `riviere-workflow`.

### 3.3 Builder Creation and Workflow Compatibility Rules

The underlying builder requires `sources` and `domains` at construction (`RiviereBuilder.new()`). The workflow therefore creates the shared builder facade eagerly at startup from its top-level graph definition.

**How it works (aligned with `workflow run` in §3.6):**

1. Load workflow YAML; assert `apiVersion: v1`
2. Structural validation of intrinsic workflow shape
3. Derive the effective execution plan for the current run mode
4. Validate referenced config files, step configs, and runtime prerequisites only for steps in that effective plan
5. Create the underlying `RiviereBuilder.new({ name, description, sources, domains }, output)` and wrap it in the shared `WorkflowBuilder` facade — builder constructed exactly once, eagerly, after all active-step validation passes
6. Execute steps sequentially with that concrete builder
7. On success: `builder.build()` → write JSON to `output` path
8. On failure at any step: abort, discard builder state, exit non-zero

**Why the workflow owns this data:** `sources` and `domains` are graph-wide builder inputs, not step-local behavior. Modules remain step-local because the builder does not require a global module registry.

**Compatibility rule:** Step configs may still declare sources and domains for standalone direct usage. During workflow execution:

- any domain referenced by a step config must exist in the workflow's `domains`
- source identity is the `repository` field from `SourceInfo`; any source declared by a step config must match a workflow source with the same `repository`
- if both workflow and step config specify `commit` for the same source, the values must match exactly
- if a step config includes metadata for a workflow-declared domain, `description` and `systemType` must match exactly

**`addDomain()` becomes idempotent:** If a domain with the same name already exists, the call is a no-op (no error). Same for `addSource()`.

### 3.4 Built-in Step Types

#### `code-extraction`

Runs the Phase 10/11/12 extraction pipeline against a TypeScript codebase, feeding discovered components and links into the shared workflow builder.

```yaml
- name: extract-orders
  type: code-extraction
  config: ./orders/riviere-config.yaml # Extraction config (Phase 11 format)
```

The extraction config remains the source of truth for extraction behavior — detection rules, metadata extraction, connection patterns, strictness, and modules. Workflow usage must behave the same as direct CLI usage with the same extraction config.

The extraction config may still declare sources and domains for standalone usage. In a workflow run, those declarations are validated against the workflow's top-level `sources` and `domains`.

**Required extraction refactor (hidden scope made explicit):** Today `riviere extract` owns the full lifecycle — it creates its own builder (or equivalent internal structure), drives extraction, then writes JSON to stdout/file via a CLI-shell presenter. To make `code-extraction` a workflow step that feeds the shared builder, `riviere-extract-ts` must be refactored as follows:

1. **Extract a pure core** (`extractInto(writePort, config, options)` or equivalent) that accepts a caller-supplied write port rather than owning output concerns. The port exposes the typed component-write and link methods the extractor needs **plus** a draft-diagnostic channel (`reportMissingField`, `reportUncertainLink`, or equivalent) so `_missing` / `_uncertain` cross the boundary explicitly instead of being hidden in workflow-only code. No filesystem writes. No presenter. No `process.exit`.
2. **Provide two write-port adapters over builder state:**
   - a **strict direct-CLI adapter** over a fresh builder that preserves current duplicate-component failure behaviour for standalone `riviere extract`
   - a **merge-capable workflow adapter** over the shared workflow builder that routes component writes through typed `upsert*` methods and routes link writes through the standard deduping `link()` surface
   - both adapters consume the same explicit draft-diagnostic channel; the direct-CLI adapter preserves today's direct-extract behaviour, while the workflow adapter records workflow diagnostics
   - the workflow adapter still detects **same-step duplicate component emission** from one extractor run by tracking canonical IDs written during that step and throwing on duplicate re-emission; merge/upsert behaviour applies only against builder state that pre-existed the current step
   - same-step duplicate **links** are still treated by the normal tuple-dedupe rule, not as hard errors
3. **Rewrite `riviere extract` CLI** as a thin shell that: constructs a builder from the extraction config's own `sources` / `domains`, binds the strict direct-CLI write-port adapter, calls the pure core, then writes `builder.build()` to stdout or the configured output path. Preserves current CLI behaviour exactly — same inputs → same output JSON.
4. **`code-extraction` step handler** calls the same pure core with the merge-capable workflow write-port adapter backed by the shared workflow builder. Zero behavioural divergence in extraction logic between direct CLI and workflow usage; only the write-port semantics differ where Phase 13 intentionally needs merge-aware composition.
5. **Lenient-mode incomplete-state diagnostics**: the core still surfaces draft missing/uncertain state through the write port's explicit diagnostic channel; the workflow adapter converts those into structured runtime diagnostic events rather than graph fields. They never enter `riviere-schema`, and `builder.build()` fails with an `IncompleteGraphError` if unresolved missing-field / uncertain-link diagnostics remain at workflow completion (§3.5.2).
6. **ts-morph resource management**: the core is responsible for disposing any per-call ts-morph `Project` instances before returning, so multiple `code-extraction` steps in one workflow run do not accumulate compiler state.

This refactor lands in `riviere-extract-ts` and `riviere-cli` as a prerequisite of the `code-extraction` step — it is **not** a downstream detail of Phase 13 but a named deliverable. See success criterion #24.

**Non-goal:** changing extraction behaviour itself. The refactor is purely a structural separation of concerns — current tests for `riviere extract` must continue to pass unchanged against the rewritten CLI shell.

#### `eventcatalog-import`

Imports components and connections from an EventCatalog instance. Uses a workflow-owned `EventCatalogClient` adapter backed by `@eventcatalog/sdk` to read events, services, and producer/consumer relationships. Only that adapter imports the SDK; the step handler depends on the adapter interface.

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

EventCatalog producer/consumer relationships must resolve to canonical Riviere component identities before links are created. If a mapping is missing and convention-based defaults can't resolve that identity (for example, a service has no domain), strict mode (`allow-unmapped: false`) fails with a clear error. Lenient mode (`allow-unmapped: true`) skips the unmapped item and records it in the step's unmapped-items summary (see §3.4.2).

Phase 13 intentionally keeps EventCatalog integration narrow. It maps only the obvious internal concepts needed by the demo (`Domain` → domain, `Service` → `UseCase`, `Event` → `Event`, consumer relationships → `EventHandler`). External participants, out-of-repo systems, and richer EventCatalog semantics are treated as unmapped in this phase.

**Schema — `eventcatalog-import.yaml` and `eventcatalog-mappings.yaml` both validated by JSON Schema.** Both schemas live in `riviere-extract-config` alongside the workflow and extraction-config schemas. All §2.6 rules apply: every string field has `minLength: 1`, `type` is an enum of `ComponentType` values (reused from `riviere-schema`), `allow-unmapped` is a required boolean, `domains` / `services` / `events` sections are optional objects keyed by EventCatalog names, and unknown top-level keys are rejected (`additionalProperties: false`). The step handler's `validateConfig()` parses the YAML and validates against the schema at `workflow validate` time — typos and shape errors fail before `workflow run` ever starts.

#### `asyncapi-import`

Imports components and connections from an AsyncAPI spec. Uses a workflow-owned `AsyncApiDocumentClient` adapter backed by `@asyncapi/parser`. Only that adapter imports the parser; the step handler depends on the adapter interface. Phase 13 targets AsyncAPI v3 only.

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

| AsyncAPI Concept    | Default Riviere Mapping                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Message             | Event component (message name → event name)                                                          |
| Operation (send)    | Link (sender → event, type: async)                                                                   |
| Operation (receive) | EventHandler component + link (event → handler, type: async)                                         |
| Channel             | **Dropped** — channels are broker infrastructure, not flow nodes. Not modelled as Custom components. |

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

AsyncAPI operations must resolve to canonical Riviere component identities before publisher/subscriber links are created. Phase 13 supports AsyncAPI v3 publish/subscribe only. Request/reply patterns are out of scope and fail validation with an unsupported-pattern error. Unmapped items under `allow-unmapped: true` are recorded per §3.4.2.

Phase 13 intentionally keeps AsyncAPI integration narrow. It maps only the obvious internal concepts needed by the demo (`message` → `Event`, send/receive operations → internal publisher/handler-side components + links). External participants, infra-rich modelling, and broader AsyncAPI semantics are treated as unmapped in this phase.

**AsyncAPI v3 field-level scope (exhaustive):**

| AsyncAPI v3 concept                               | Phase 13 treatment                                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `info.title`, `info.description`                  | Consumed; become part of spec-derived metadata on the synthesised publisher/subscriber components.                                                         |
| `servers`                                         | **Dropped.** Broker infrastructure, not component flow. Step does not fail on its presence.                                                                |
| `channels`                                        | Read to resolve message payloads and parameters; not synthesised as components (channels are infrastructure, not flow nodes).                              |
| `channels.*.parameters`                           | **Dropped** in Phase 13. Dynamic topic parameters are deferred.                                                                                            |
| `channels.*.bindings`                             | **Dropped** in Phase 13. Broker-specific bindings are noise for flow extraction.                                                                           |
| `operations` with `action: send`                  | Consumed — resolved to a canonical publisher component via mappings; async link added from publisher → event.                                              |
| `operations` with `action: receive`               | Consumed — resolved to a canonical EventHandler via mappings; async link added from event → handler.                                                       |
| `operations.*.reply`                              | **Fails validation** with `asyncapi request/reply pattern not supported in Phase 13 (operation: '<id>')`. Strict behaviour regardless of `allow-unmapped`. |
| `operations.*.traits`                             | **Dropped.** Operation-level trait composition is applied by the parser before this step sees the spec; no extra handling.                                 |
| `messages`                                        | Consumed — resolved to canonical Event components via mappings.                                                                                            |
| `messages.*.payload`                              | Consumed as metadata on the Event component (schema reference preserved; full payload schema is not inlined into the graph).                               |
| `messages.*.headers`, `messages.*.bindings`       | **Dropped** in Phase 13.                                                                                                                                   |
| `components.*` (reusable schemas, messages, etc.) | Resolved by `@asyncapi/parser` before this step sees the spec; no special handling required.                                                               |
| `security`, `tags`, `externalDocs`                | **Dropped** in Phase 13.                                                                                                                                   |

Any other AsyncAPI v3 field not listed above is dropped silently; the step never fails for an unrecognised top-level key (AsyncAPI evolves, and we don't want new v3 micro-revisions to break imports). The list above is exhaustive for the Phase 13 scope decision — future phases may promote dropped items to consumed, and the list is updated accordingly.

**Schema — `asyncapi-import.yaml` and `asyncapi-mappings.yaml` both validated by JSON Schema.** Both schemas live in `riviere-extract-config`. Same §2.6 rules as EventCatalog: `minLength: 1` on every string field, `type` from the `ComponentType` enum, `allow-unmapped` required boolean, `messages` / `operations` optional objects keyed by AsyncAPI names, `additionalProperties: false`. The step handler's `validateConfig()` validates at `workflow validate` time.

#### `ai-extract`

Discovers components and connections that deterministic extraction missed. Analyzes source code directories, inspects the builder to see what's already been extracted, and identifies gaps.

```yaml
# ai-extract.yaml
command: claude # Executable only; args are explicit below (§3.4.1)
args: ['-p'] # Prompt piped via stdin by default; use ['--prompt', '{prompt}'] if CLI requires argv
timeout-seconds: 600
memory: ./ai-memory.md
prompt-append: ./ai-extract.instructions.md

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
```

No confidence score is recorded — Riviere does not ask the CLI to self-report confidence, and does not apply any threshold-based filtering. Every item returned by the CLI that passes response-schema validation is applied additively to the builder. Users refine AI behaviour by editing source selection, the AI memory file, and/or the optional `prompt-append` file. Full prompt replacement is intentionally out of scope in Phase 13.

`ai-extract` is gap-driven, not whole-repo discovery. It operates on bounded sources, bounded gap categories, bounded component types, and bounded context windows.

**Bound-limit overflow behaviour:** If the files matched by `sources` + `context.exclude` exceed `max-files-per-batch * max-batches`, the step does **not** silently truncate. It fails with a clear error: `ai-extract: source scope produced N files, exceeds bound (max-files-per-batch * max-batches = M). Narrow 'sources' or raise the bounds explicitly.` This forces the user to consciously size the AI scope rather than discover truncation by missing components in the output graph.

**Gap category computation (precise definitions):**

Each value in `selection.from` maps to a concrete gap set computed from builder state (via §3.5.1 read surface) plus the configured source directories:

| Gap category             | How the step computes the gap set                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `uncertain-links`        | `context.diagnostics.unresolved()` filtered to `uncertain-link` events emitted by earlier deterministic steps. Each unresolved event is a candidate for AI re-resolution.                                                |
| `missing-events`         | AI scans configured sources for event-publishing call sites, maps each to a `(domain, module, name)` candidate, filters out those whose canonical ID already exists in `builder.query().componentsByType('Event')`.      |
| `missing-event-handlers` | For each `Event` component in `builder.query().publishedEvents()` that has no inbound link from a component of type `EventHandler`, AI scans sources for plausible handler call sites targeting that event name.         |
| `missing-use-cases`      | AI scans sources for use-case-shaped call sites (framework-specific patterns allowed via the step config's future extensibility) and filters out those already present in `builder.query().componentsByType('UseCase')`. |

Any future gap category is added as a new enum value with its computation rule documented here. The step never does free-form "find anything interesting" — each category is a discrete, reviewable computation.

**Additive-only contract (see §3.5):** `ai-extract` always calls `upsert*` with `{ noOverwrite: true }`. Under this flag, a collision with an existing component returns `{ created: false }` with scalars untouched; the step logs the collision as "candidate already present" and moves on. New links are added via the standard dedup-on-tuple rule. There is no separate AI-only facade — the `noOverwrite` flag on the seven typed upsert methods is sufficient.

**Enums over strings:** `selection.from` is an enum of supported gap categories. `selection.component-types` is an enum of supported Riviere component types.

**AI runtime boundary:** The step uses `context.services.aiCli`, a workflow-owned adapter over `child_process.spawn`, to invoke the CLI executable declared in its config (`command` + `args`) — see §3.4.1. Riviere does not manage API keys, tokens, cost, rate limits, or retries. If the CLI binary is not in `PATH`, `workflow validate` already caught it via `requiredServices()` (§3.2). Response JSON is validated against a strict schema published in `riviere-extract-config`.

#### `ai-enrich`

Fills missing metadata fields on components already in the builder. Targets unresolved `missing-field` diagnostics from lenient deterministic extraction and any components lacking optional metadata.

```yaml
# ai-enrich.yaml
command: claude
args: ['-p']
timeout-seconds: 600
memory: ./ai-memory.md
prompt-append: ./ai-enrich.instructions.md

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
```

Reads source code context for each component with missing metadata and proposes values. No confidence score is recorded.

`ai-enrich` can only touch existing builder components. MVP supports `missing-fields-only: true` only.

**Additive-only contract (see §3.5):** `ai-enrich` calls the typed `upsert*` method matching the target component's type with `{ noOverwrite: true }`, supplying only the fields it wants to fill. Under `noOverwrite`, any scalar already set by an earlier step is preserved; only `undefined` / `null` fields receive the AI-proposed value. This guarantees that `ai-enrich`'s position at the end of the workflow never disturbs values set by earlier deterministic steps, regardless of last-wins ordering elsewhere.

**Enums over strings:** `selection.component-types` is an enum of supported component types. `fields` is an enum of allowed enrichable fields.

**AI runtime boundary:** Same runtime model as `ai-extract` — the step uses the workflow-owned AI CLI adapter to invoke the configured executable in its config (`command` + `args`). See §3.4.1.

#### `schema-validate`

Validates the graph by calling `builder.validate()` (the non-throwing validation entry point, see §3.5.1). Reports validation errors. Validation is always strict — no lenient mode.

```yaml
- name: validate
  type: schema-validate
```

**Why `validate()` not `build()`:** `schema-validate` is an **intermediate** checkpoint. Calling `build()` mid-workflow would throw on merely incomplete state that a later step could still complete. `validate()` returns a `ValidationResult` without throwing; the step inspects the result, logs errors, and fails cleanly if `valid === false`.

On failure: logs validation errors from `ValidationResult.errors` and the workflow exits with code 1.

**Value vs final `build()`:** `schema-validate` is an optional explicit checkpoint. Inserting it between code extraction and spec imports, for example, catches malformed code-extracted state early — before expensive AI steps run on a broken graph. Final workflow output still always calls `builder.build()` as the terminal operation, even if `schema-validate` is omitted; omitting the step only means you lose the early-failure signal.

#### 3.4.1 AI Runtime — Shell out to a User-Configured CLI

Phase 13 ships the **absolute minimum possible AI surface**. Riviere does **not** depend on any AI SDK. It does not manage API keys, tokens, cost, rate limits, retries, or prompt caching. Instead, AI steps **shell out to a CLI executable the user configures** — typically `claude`, `codex`, `ollama`, or any equivalent — and parse structured JSON from stdout.

**How it works (the whole mechanism):**

1. The AI step builds a prompt string from builder state, current unresolved workflow diagnostics, relevant source file snippets, a step-type-specific prompt template, the optional AI memory file, and the optional `prompt-append` file.
2. The step calls `context.services.aiCli.run(...)`; the workflow-owned AI CLI adapter invokes the configured CLI executable with the prompt supplied via stdin (preferred) or as an argument.
3. The step captures stdout.
4. The step validates stdout against a strict JSON Schema for that step type (response schema lives in `riviere-extract-config`).
5. The step applies the response to the shared builder using the existing typed `upsert*` methods with `{ noOverwrite: true }` and standard link dedup.

**Configuration (in the step config, not global):**

```yaml
# ai-extract.yaml
command: claude                   # Executable only
args: ['-p']                      # Prompt piped via stdin by default
# OR
args: ['--prompt', '{prompt}']    # If the CLI takes the prompt as an argument, include exactly one placeholder
timeout-seconds: 600              # Hard cap enforced by Riviere (SIGKILL on timeout)
memory: ./ai-memory.md            # Optional static repo learnings / false-positive suppressions
prompt-append: ./extra-prompt.md  # Optional extra instructions appended after the built-in prompt
sources:
  - ./orders/src
  - ./shipping/src
selection:
  ...
```

- `command` is a required string naming the executable to invoke.
- `args` is an optional explicit argv array. The workflow-owned AI CLI adapter executes `[command, ...args]` via `child_process.spawn` with `shell: false`. If `args` contains `{prompt}` exactly once, the prompt is substituted into that argv slot; otherwise the prompt is piped via stdin.
- `timeout-seconds` is a required integer (`minimum: 1`). Exceeding the timeout kills the child process and fails the step.
- `memory` is an optional path to a user-authored text/Markdown file containing repo-specific learnings, known false positives, naming conventions, and intentional absences.
- `prompt-append` is an optional path to a text/Markdown file appended after the built-in prompt template. It gives users controlled prompt flexibility without allowing full prompt replacement.
- Memory-derived suppressions are applied during prompt construction where possible and again before AI results are applied to the builder.
- **No env vars, no API keys, no provider config in YAML.** Authentication is whatever the CLI binary itself requires — `claude` has its own auth, `codex` has its own, `ollama` has none. Riviere never sees or touches credentials.
- **Process/env policy:** the AI CLI adapter inherits the current process environment as-is, does not load `.env`, does not mutate env vars, and does not copy raw stdout/stderr into structured workflow logs except bounded failure context needed for debugging.

**What `workflow validate` checks (via `requiredServices()` → `'ai-cli'`):**

- `command` resolves in `PATH`. If it doesn't: `workflow validate` fails with `Step '<name>' (<type>) requires the '<command>' CLI, but it is not installed or not in PATH`.
- `args` parses correctly (at most one `{prompt}` placeholder).
- `memory` / `prompt-append` paths exist when configured.

**What Riviere does NOT build:**

- API-key loading, keychain integration, dotenv parsing.
- Token counting, cost estimation, budget caps.
- Rate limiting, exponential backoff, retries, circuit breakers.
- Prompt caching, response caching, replay.
- Model selection, reasoning mode, temperature controls — whatever the user wants is expressed in the configured executable + args (e.g. `command: claude`, `args: ['--model', 'claude-opus-4-6', '-p']`).

All of the above is the CLI binary's problem. If the CLI already provides it, great. If not, it's still not Riviere's problem.

**`--dry-run` flag on `workflow run`:** for every AI step that would execute, prints the prompt that would be sent to stdout and skips the CLI invocation. No graph mutation from AI steps under `--dry-run`. AI CLI prerequisite checks are also skipped in this mode because no child process is spawned. Useful for review and CI gating.

**`--skip-ai` flag on `workflow run`:** removes AI steps from the effective execution plan entirely (no prompt construction, no AI config-file existence checks, no AI config validation, no child process, no AI runtime-prerequisite checks). Deterministic-only output. This is how CI runs the deterministic-path idempotency test (criterion #13a) without touching any AI CLI.

**Response schema (strict, per AI step type):** each AI step type has a JSON Schema in `riviere-extract-config` defining what the CLI's stdout must contain. Malformed JSON, schema violations, or fields the step didn't ask about fail the step with a clear error. Same §2.6 strictness rules — empty strings banned, enums mandatory, `additionalProperties: false`. The response schema is published and documented so prompt authors (and users of third-party CLI agents) can target it exactly.

**Why this design:**

- Zero coupling to any specific AI provider.
- Zero auth/secret surface in Riviere.
- Works on day one with any CLI the user already has.
- When a better CLI appears next year, switch by editing one line of step config — no Riviere release needed.

#### 3.4.2 Unmapped-Items Diagnostics (lenient import steps)

When `eventcatalog-import` or `asyncapi-import` runs with `allow-unmapped: true`, skipped items are emitted as structured events into the workflow's NDJSON diagnostic log (§3.9) rather than lost in a stream of warning lines.

**Behaviour:**

- Each skip is recorded with: source-system record identifier (e.g. EventCatalog service name, AsyncAPI operation id), reason (`no-domain`, `no-canonical-mapping`, `unresolved-producer`, `unresolved-consumer`, `unsupported-pattern`, etc. — enum owned by the step type), and source location where known.
- At step completion, the step logs a one-line summary: `import-eventcatalog: imported 180, skipped 20 (see workflow.log.ndjson)`.
- Strict mode (`allow-unmapped: false`) does not emit skip-summary events; a skip is a step failure, not a summary entry.

**Representative NDJSON event:**

```json
{
  "runId": "2026-04-14T12:34:56Z#ecommerce-architecture",
  "timestamp": "2026-04-14T12:34:56Z",
  "eventType": "import-skipped-record",
  "step": "import-eventcatalog",
  "stepType": "eventcatalog-import",
  "payload": {
    "recordId": "OrdersService",
    "recordType": "service",
    "reason": "no-domain",
    "sourceLocation": "eventcatalog/services/orders-service/index.mdx"
  }
}
```

The workflow log is the diagnostic artefact. It is structured, diffable, parseable, and searchable without multiplying sidecar files.

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

**Precedence rule (last-wins):** For scalar conflicts on the same canonical component, the later step overwrites the earlier one. Teams order workflows per §2.2 so higher-priority sources run later and therefore win. AI steps (`ai-extract`, `ai-enrich`) are **additive-only** and never participate in scalar overwrite regardless of order.

**New API methods — one per component type, mirroring the existing `add*` surface:**

```typescript
interface UpsertOptions {
  /** When true, existing scalar values are preserved (AI / additive-only callers). */
  noOverwrite?: boolean
}

upsertUI(input: UIInput, options?: UpsertOptions): { component: UIComponent, created: boolean }
upsertApi(input: APIInput, options?: UpsertOptions): { component: APIComponent, created: boolean }
upsertUseCase(input: UseCaseInput, options?: UpsertOptions): { component: UseCaseComponent, created: boolean }
upsertDomainOp(input: DomainOpInput, options?: UpsertOptions): { component: DomainOpComponent, created: boolean }
upsertEvent(input: EventInput, options?: UpsertOptions): { component: EventComponent, created: boolean }
upsertEventHandler(input: EventHandlerInput, options?: UpsertOptions): { component: EventHandlerComponent, created: boolean }
upsertCustom(input: CustomInput, options?: UpsertOptions): { component: CustomComponent, created: boolean }
```

There is **no generic `upsertComponent(ComponentInput)`**. Each step calls the method matching the component type it is producing (the step always knows the target type — mapping configs, extraction pipelines and import conventions resolve to a specific Riviere component type before the builder is called). This preserves the codebase convention of explicit, narrowly-typed add methods over wide generic entry points, and keeps type-specific required-field validation at the API boundary.

The single `noOverwrite` option covers the additive-only AI use case without adding a parallel set of methods — same seven endpoints, one boolean that inverts the scalar merge rule.

**Behaviour (identical across all seven methods):**

- If component ID does not exist → creates component (same semantics as the matching `add*` method)
- If component ID exists and existing component has the **same type** → merges metadata into existing component, returns `{ created: false }`
- If component ID exists and existing component has a **different type** → throws `ComponentTypeMismatchError` (same ID derived from same `(domain, module, type, name)` should never collide across types; collision indicates a bug in mapping config)

**Merge semantics (last-wins default, unified across the builder):**

- **Scalar fields** (string, number, boolean): **last-wins by default** — incoming value overwrites existing, unless the incoming value is `undefined` or `null` (the canonical "don't touch" signal). Empty strings never reach this code path (see "Schema-enforced strictness" below). Teams order workflows so highest-priority sources run last (§2.2). This generalises the scalar-overwrite rule that `enrichComponent` already uses for `entity` / `signature` across all typed upsert methods.
- **Terse-but-set values are authoritative by design.** If a spec author writes a short `description`, that short value wins over a rich code-derived description. Last-wins is intentional: the highest-priority source owns the scalar field, and spec authors own their specs. Richness heuristics (length, token count, etc.) are explicitly rejected — they would produce surprising, non-deterministic merges.
- **`noOverwrite` flag** — when a caller passes `{ noOverwrite: true }`, scalar writes are applied only to fields whose existing value is `undefined` / `null`. Already-set scalars are preserved. No error is raised for skipped fields (the call is cooperative, not strict). Arrays still union.
- **Array fields** (stateChanges, businessRules, subscribedEvents): **union** — new items appended, duplicates removed (unchanged from existing enrichment behaviour, unaffected by `noOverwrite`). Empty-array incoming values are no-ops.
- **Nested objects** (behavior, metadata): field-level merge — each nested scalar field follows the scalar rule (including `noOverwrite` if set), each nested array field follows the array rule.
- **Required-identity fields** (`name`, `domain`, `module`, `type`): encoded in the component ID — same ID implies same values. A mismatch on `name` / `domain` / `module` / `type` means the IDs differ and upsert creates a new component rather than merging. A same-ID, different-`type` collision (logically impossible given the ID formula, but guarded anyway) throws `ComponentTypeMismatchError` per the rule above.

**Schema-enforced strictness — empty strings are banned everywhere:** All string fields on all Riviere component inputs, link inputs, step configs, mappings files, and workflow files **must have `minLength: 1`** (or equivalent) at the schema boundary. Empty strings are workaround values and are rejected at validation time, not tolerated at the merge boundary. The merge engine therefore only ever sees real values or `undefined`/`null` — never `""`. This is the same strictness convention already applied in `riviere-schema` (see `packages/riviere-schema/src/minlength-*.spec.ts`) and is extended across all Phase 13 schemas.

- **If a user wants a field unset**, they omit it from the YAML. They do not set it to `""`.
- **If a user supplies `""` on a required string**, schema validation fails with a clear message ("string field X may not be empty") before any step executes.
- **No code in the merge path handles empty-string-as-unset.** Handling it downstream would hide the input error, invite silent data loss, and violate the "prevent workarounds at the boundary" principle.

**Additive-only contract for AI steps:** `ai-extract` and `ai-enrich` must call `upsert*` with `{ noOverwrite: true }`. This is a convention enforced by the step handlers, not a separate API surface:

- `ai-extract` passes `noOverwrite: true`. If the component already exists (`created: false`), the step logs it as a collision-with-prior-source and skips further mutation for that component.
- `ai-enrich` passes `noOverwrite: true` for every upsert call. Fields already set by deterministic steps are preserved; only `undefined` / `null` fields receive the AI-proposed value.

`noOverwrite` is a boolean knob on the seven existing typed upsert methods — it does not introduce a parallel method set or a separate facade. Any step may use it; AI steps always use it.

**Link deduplication:** `link()` deduplicates by `(source, target, type)` tuple. A second call with the same tuple is a no-op. Phase 13 does **not** merge duplicate links. Duplicate attempts emit a structured `duplicate-link-skipped` event into the workflow log. `linkExternal()` deduplicates by `(source, target.repository, target.name, type)` under the same no-op rule.

**`addDomain()` and `addSource()` become idempotent:** Adding a domain/source that already exists is a no-op. No error. Source identity = `repository`. Domain identity = domain name.

#### 3.5.1 Workflow Builder Read Surface

Phase 13 does **not** introduce new read-method names for step authors. The workflow facade mirrors the familiar builder surface, while the underlying `RiviereBuilder` remains graph-only. Step handlers and transition-fixture capture use the workflow-facing surface below:

| Method                                 | Purpose                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `builder.validate(): ValidationResult` | **Workflow-facade validation**: underlying builder graph validation plus unresolved workflow diagnostics. `schema-validate` step uses this. |
| `builder.warnings()`                   | Non-fatal issues on the current graph (runtime logs the per-step delta).                                                                    |
| `builder.stats()`                      | Counts of components, links, domains.                                                                                                       |
| `builder.orphans()`                    | Component IDs with no incoming or outgoing links.                                                                                           |
| `builder.query(): RiviereQuery`        | Full read-only query object (see `@living-architecture/riviere-query`).                                                                     |
| `builder.build(): RiviereGraph`        | **Workflow-facade finalization**: underlying builder `build()` plus unresolved-workflow-diagnostic guard. Used for final output.            |

`RiviereQuery` already exposes `components()`, `links()`, `find(predicate)`, `findAll(predicate)`, `componentById(id)`, `componentsInDomain(name)`, `componentsByType(type)`, `publishedEvents()`, `eventHandlers()`, `externalLinks()`, and more. Phase 13 does **not** add draft-only helper methods to `RiviereQuery`. AI steps that need incomplete-state information read it from `StepContext.diagnostics`, not from `RiviereGraph`.

#### 3.5.2 Workflow-Only Incomplete-State Diagnostics

Today `_missing` lives on `EnrichedComponent` (extract-ts) and `_uncertain` on `ExtractedLink` (extract-ts). In Phase 13 these remain **draft-only extractor markers** and do **not** become valid `riviere-schema` fields.

- **`riviere-schema` remains unchanged** — `_missing` / `_uncertain` are not added to `Component` or `Link`.
- **Workflow/runtime boundary:** when `code-extraction` runs in lenient mode, draft markers are converted into structured diagnostic events keyed by canonical component identity / link tuple.
- **Runtime diagnostics view:** unresolved `missing-field` / `uncertain-link` events are available to later steps through `StepContext.diagnostics` and are written to the workflow log (§3.9).
- **Canonical keys:** `missing-field` diagnostics key on `(componentId, field)`; `uncertain-link` diagnostics key on `(source, target, linkType)`. These keys are stable across steps and log events.
- **Resolution ownership:** the `WorkflowBuilder` facade is the default resolver. Successful upserts automatically resolve matching `(componentId, field)` diagnostics only when the field transitions from unset to set. Successful link additions automatically resolve matching uncertain-link tuples only when a new matching link is actually created. Skipped writes under `{ noOverwrite: true }` do **not** resolve diagnostics. Step handlers call `diagnostics.resolve()` only for exceptional cases where no builder mutation can express the resolution directly.
- **Resolution logging:** every auto-resolution or explicit resolution emits a `diagnostic-resolved` log event keyed to the same canonical diagnostic so log-parsing commands can reconstruct current unresolved state.
- **Validation/build:** `builder.validate()` reports unresolved incomplete-state diagnostics as validation failures, and `builder.build()` throws `IncompleteGraphError` if any unresolved `missing-field` / `uncertain-link` diagnostics remain.

Result: AI steps can operate on the draft / in-progress state, while the final `RiviereGraph` remains clean and schema-valid. The underlying `RiviereBuilder` stays graph-only; the `WorkflowBuilder` facade composes underlying graph validation/finalization with the runtime diagnostics store so `validate()` / `build()` reflect both concerns without moving workflow semantics into `riviere-builder`.

Standalone `riviere extract` preserves current draft-output semantics. Only workflow execution converts draft missing/uncertain state into runtime diagnostics.

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

Interactive setup that builds the workflow definition and step configs for a **greenfield** repository. Guides the user through:

1. What codebases to extract from → creates `code-extraction` steps and scaffolded extraction configs
2. What external specs exist → creates import steps and mapping-config templates
3. Whether to include AI steps → adds `ai-extract` / `ai-enrich` steps
4. Validation step

Outputs the workflow YAML file and all referenced config/mapping files.

**Greenfield-only policy — refuse to run if existing extraction configs are detected.** Before writing any files, `init` walks the target directory for known extraction-config files (`riviere-config.yaml|yml`, `extraction.config.json|yaml|yml`, including `.riviere/config/`). If any are found:

- Print the list of detected configs with absolute paths.
- Print the error: `existing extraction configs detected; workflow init is greenfield-only.`
- Print a ready-to-copy AI-assistant prompt instructing the assistant to inspect the detected configs, draft a `riviere-workflow.yaml` that preserves them, call out behavioural differences from existing `riviere extract` usage, list unresolved questions, and make no edits until the plan is reviewed.
- Exit with non-zero code **without creating any files**.

Rationale: Phase 13 does not ship an automated migration tool. Automatic detect-and-wire risks producing a workflow that subtly differs from the user's current extract invocation (paths, working directory, inherited CLI flags). The AI-assistant prompt is a guided drafting aid, not an automatic converter. A short migration guide (`docs/workflow/migrating-from-extract.md`) is part of Phase 13 documentation scope — see success criterion #30.

`riviere workflow init` is distinct from `riviere extract`. `extract` is for single-codebase extraction (Phase 10-12 direct usage). `workflow run` is for multi-source orchestration (Phase 13). They are separate commands — `extract` does not accept a `--workflow` flag.

**Upgrade path for existing `extract` users (documented, not automated):**

1. Keep the existing extraction config(s) unchanged.
2. Create `riviere-workflow.yaml` manually with workflow-level `name`, `description`, `output`, `sources`, `domains`.
3. Add a single `code-extraction` step with `config: ./<path-to-existing-extraction-config>`.
4. Run `riviere workflow validate` to confirm the compatibility rules in §3.3 pass (workflow `sources` / `domains` must be compatible with the extraction config's declarations).
5. Run `riviere workflow run` to produce the equivalent output graph.

The workflow run and the prior `riviere extract` invocation must produce the same component IDs and link tuples against the same config (the parity guarantee from §3.4 "Required extraction refactor" + success criterion #25).

#### `riviere workflow run`

Executes the workflow:

1. Load and parse YAML; assert `apiVersion: v1`
2. Validate workflow structure against JSON Schema (intrinsic workflow shape only)
3. Resolve step handlers by type name
4. Apply runtime flags to derive the effective execution plan (`--skip-ai`, `--dry-run`)
5. For steps in the effective execution plan, assert referenced config files exist on disk
6. Call `validateConfig()` only on steps in the effective execution plan (fail-fast before execution)
7. Run `requiredServices()` checks against the effective execution plan only (e.g. AI CLI resolution for AI steps that would actually invoke a CLI)
8. Execute steps sequentially, passing shared builder
9. On success: write `builder.build()` output to `output` path
10. On failure: report which step failed, why, keep the structured workflow log, and exit code 1

**Flags:**

- `--dry-run` — executes deterministic steps normally; for every AI step that would invoke its configured CLI, prints the prompt that would be sent (to stdout) and skips the CLI invocation and any graph mutation that would have come from the AI response. AI prerequisite checks are skipped for those steps because no invocation occurs. Useful for prompt review and CI cost-gating. Other step types are unaffected.
- `--skip-ai` — skips AI steps entirely (no prompt construction, no AI config-file existence checks, no AI config validation, no CLI invocation, no AI prerequisite checks). Deterministic-only output. This is how the deterministic-idempotency test (§3.8.3, criterion #13a) runs in CI without any AI CLI present.

**Error handling:** If a step fails, the workflow aborts. No retry, no skip, no partial **graph** output. Builder state is discarded. The structured workflow log remains available for debugging.

**Distinction between error types:**

- **Config errors** (missing file, invalid YAML, schema violation): always fail, regardless of lenient mode
- **Extraction strictness** (`allow-incomplete`): controls whether unresolvable types produce errors or unresolved incomplete-state diagnostics within a `code-extraction` step. Does not affect workflow-level abort semantics.
- **AI CLI failures** (non-zero exit from the shelled-out CLI, timeout hit, stdout is not valid JSON matching the response schema): fail the owning AI step; workflow aborts per the standard rule.

**Step summary output:** Each step logs completion with duration. Workflow completion prints the multi-line summary block documented in §3.9.3.

#### `riviere workflow validate`

Three validation levels, all running in fail-fast order:

1. **Structural:** YAML parses, required fields present, all referenced config/mapping files exist on disk.
2. **Semantic:** Each step handler's `validateConfig()` runs against its config (extraction configs validate against schema, mappings files parse correctly, AI configs validate enums/limits, step-declared domains and sources are compatible with the workflow).
3. **Runtime-prerequisite availability:** Each step handler's `requiredServices()` is called. For `'ai-cli'` the runtime resolves the step config's `command` executable against `PATH`; if it doesn't resolve, validation fails with a clear per-step message (`Step '<name>' (<type>) requires the '<command>' CLI, but it is not installed or not in PATH`). No env-var probing, no API-key checks — Riviere never touches credentials. See §3.2 and §3.4.1 for the contract.

Does not execute steps. Fails fast at the first level that produces an error; subsequent levels are not run. Exit code is non-zero on any failure; the message names the level and the offending step.

### 3.7 Architecture Fit

Phase 13 introduces a new `riviere-workflow` package.

```text
riviere-cli
  -> riviere-workflow

riviere-workflow
  -> riviere-builder
  -> riviere-extract-config
  -> riviere-extract-ts
  -> riviere-schema
  -> riviere-query
```

**Responsibilities:**

- `riviere-cli` — CLI entrypoints (`workflow run`, `workflow init`, `workflow validate`)
- `riviere-workflow` — workflow executor, step registry, exported step contract, built-in steps, shell-out invocation of user-configured AI CLIs (§3.4.1). No AI SDK dependency.
- `riviere-builder` — graph construction, idempotent `addSource()` / `addDomain()`, and the seven typed `upsert*` methods with `{ noOverwrite }`
- `riviere-extract-config` — workflow and step config schemas/types, mapping file schemas, AI response schemas
- `riviere-extract-ts` — deterministic extraction; exposes the pure `extractInto(writePort, config, options)` core reused by `code-extraction`

**Extension direction:** Phase 13 exports the step contract now but does not implement user plugin loading. Built-in steps are resolved through the same registry that future external steps will use.

**Repository hygiene requirements for the new `riviere-workflow` package:**

- **Folder structure** follows the monorepo convention for library packages (`src/features/*`, `src/platform/*`, `src/index.ts`) per ADR-002 and the `separation-of-concerns` skill. No `src/shell/*` is expected unless the package later grows true app-wiring concerns.
- **Dependency-cruiser rules** copied and adapted from existing packages so no cross-feature imports, no domain-to-upward dependencies, and `entrypoint` restrictions are enforced from day one. Added to the repo's root `dependency-cruiser.mjs`.
- **Role enforcement:** `riviere-workflow` is enforced per `.riviere/role-enforcement.config.ts`. Every exported declaration in the package receives a `/** @riviere-role <role-name> */` tag. Roles for the new package (e.g. `workflow-runtime`, `step-handler`, `step-registry`) are added to `.riviere/roles.ts` in the same PR that introduces the package.
- **Coverage:** 100% test coverage mandatory per the root `CLAUDE.md` testing convention.
- **Cross-package imports:** uses `@living-architecture/riviere-builder`, `@living-architecture/riviere-extract-config`, `@living-architecture/riviere-extract-ts`, `@living-architecture/riviere-schema`, `@living-architecture/riviere-query` via workspace references; never relative paths across package boundaries.

### 3.7.1 Milestones

Phase 13 is ordered into six milestones. Demo-app groundwork (M0) must land before any milestone can claim a success criterion that references demo-app fixtures. The authoritative planning contract lives in §7; this table is the quick milestone map.

| Milestone | Name                         | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Claims success criteria                                   |
| --------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| M0        | Demo App Groundwork          | Lands in `ecommerce-demo-app` repo: five domain codebases plus `bff/` and `ui/`, deliberate extraction gaps, EventCatalog, AsyncAPI spec, mapping files, workflow YAML, step configs, ground truth, 7 transition fixtures, README. Inter-repo contract wired (pinned SHA from `living-architecture` CI).                                                                                                                                                                                      | Precondition for §3.8 criteria; no direct criterion claim |
| M1        | Workflow Engine + Builder    | `riviere-workflow` package scaffold, registry runtime, step contract, shared builder, workflow JSON Schema in `riviere-extract-config`, `upsert*` methods + `noOverwrite`, workflow-only incomplete-state diagnostics, extraction refactor (§3.4).                                                                                                                                                                                                                                            | #1, #2, #5, #11, #12, #20, #21, #24, #25, #26, #46        |
| M2        | Built-in Deterministic Steps | `code-extraction`, `eventcatalog-import`, `asyncapi-import`, `schema-validate` step handlers; mapping-file schemas; compatibility-rule validation.                                                                                                                                                                                                                                                                                                                                            | #3, #4, #15, #16, #23, #47                                |
| M3        | AI Steps                     | `ai-extract`, `ai-enrich` step handlers; shell-out to user-configured AI CLI per §3.4.1; response JSON schemas in `riviere-extract-config`; gap-category computation; `--dry-run` and `--skip-ai` flags on `workflow run`. **Scope note:** the shell-out design keeps AI surface small enough to belong in this phase — no SDK dependency, no credential surface, no retry/rate-limit logic to design. If AI behaviour were larger, it would split into its own phase.                        | #6, #7, #14, #22, #33, #48                                |
| M4        | CLI Commands                 | `riviere workflow run` (with `--dry-run` and `--skip-ai`), `riviere workflow init`, `riviere workflow validate`; step summary output; error handling. **`init` UX scope:** greenfield-only (refuses if existing extraction configs are detected, per §3.6); minimal interactive prompts (codebases → spec sources → AI yes/no → validation step). No interactive cwd-detection of specs, no auto-wiring of existing configs; failure path prints a ready-to-copy AI migration prompt instead. | #9, #10, #17, #30, #34                                    |
| M5        | End-to-End Demo Verification | Phase 13 CI pulls `ecommerce-demo-app` at pinned SHA, runs full workflow, verifies ground truth and transition fixtures. Idempotency verification runs the deterministic-only variant of the demo workflow (AI steps skipped) per #13a; AI-inclusive idempotency (#13b) is deferred.                                                                                                                                                                                                          | #8, #13a, #18, #19                                        |

**M0 acceptance criteria (demo-app repo PR must satisfy before M0 closes — augments existing repo, see §3.8 for what already exists vs what Phase 13 adds):**

- D0.1 The five existing domain codebases (`orders-domain/`, `shipping-domain/`, `inventory-domain/`, `payment-domain/`, `notifications-domain/`) plus `bff/` and `ui/` continue to build cleanly and `verify-extraction.mjs` continues to pass against the existing `expected-extraction-output.json` / `expected-connections.json`. **Existing extraction artifacts are not modified.**
- D0.2 A named list of deliberate extraction gaps is documented in a new "Phase 13 Workflow" section of the existing README, each gap mapped to the source location and the expected AI-discovery outcome. (Gaps may already exist in the codebase; Phase 13's job is to enumerate them.)
- D0.3 New EventCatalog instance under `specs/eventcatalog/` is valid and covers the cross-domain event flows that span all five domains. Includes the **EventCatalog SDK coverage spike**: demo-app M0 PR includes a passing test that loads the demo EventCatalog via `@eventcatalog/sdk` and yields all relationships `eventcatalog-import` consumes. M2 cannot start until this spike resolves.
- D0.4 New `specs/asyncapi.yaml` validates via `@asyncapi/parser` and covers pub/sub only (no request/reply in Phase 13).
- D0.5 New mapping files (`specs/eventcatalog-mappings.yaml`, `specs/asyncapi-mappings.yaml`) normalise to canonical Riviere identity across all five domains; passes a per-mapping schema test.
- D0.6 New `riviere-workflow.yaml` at the repo root references the existing `.riviere/config/extraction.config.json` from a single `code-extraction` step; `riviere workflow validate` passes.
- D0.7 Workflow ground-truth fixture exists. Either (a) extends `expected-extraction-output.json` / `expected-connections.json` to also cover spec-derived and AI-discovered additions, or (b) introduces a new `tests/workflow-ground-truth.json` for the workflow assertion path. Decision documented in the demo-app PR.
- D0.8 Per-step transition fixtures (`tests/workflow-transitions/NN-after-<step-name>.json`) exist for every step in the workflow, generated via the documented capture procedure (§3.8.3 fixture generation) — never hand-edited.
- D0.9 The existing README's "Deterministic Extraction Setup Guide" content is preserved verbatim. A new "Phase 13 Workflow" section describes the orchestrated workflow run end-to-end, positioned as the next step beyond the existing 6-step pre-Phase-13 description.
- D0.10 Inter-repo contract wired: `living-architecture` CI pins the demo-app commit SHA; a dependency-update PR template exists for coordinated schema/behaviour changes.

### 3.8 Demo App Validation

Every capability is validated against `ecommerce-demo-app`, **an existing separate repository** at `NTCoding/ecommerce-demo-app`. The demo app is already a working multi-domain codebase with deterministic extraction wired up; Phase 13 **augments** it with workflow-specific artifacts (workflow YAML, EventCatalog/AsyncAPI specs, mapping files, AI step configs, transition fixtures) — it does not create the repo.

Engine code in `living-architecture` never contains demo-app source or fixtures. The inter-repo contract is part of this PRD's scope and must be explicit before M2 (built-in steps) can claim any §3.8 success criterion.

**Repository split (inter-repo contract):**

| Repository            | Owns                                                                                                                                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `living-architecture` | The workflow engine, built-in steps, CLI, schemas, and this PRD. No demo-app source or fixtures.                                                                                                                                                                                        |
| `ecommerce-demo-app`  | The demo codebase (already 5 domains + BFF + UI), EventCatalog instance, AsyncAPI v3 spec, mapping files, workflow YAML, step configs, ground-truth fixtures, and transition fixtures. Phase 13 adds the workflow-specific artifacts; deterministic extraction artifacts already exist. |

**Existing structure in `ecommerce-demo-app` (verified against the live repo at the time of writing):**

```text
ecommerce-demo-app/                          (existing separate repo)
├── orders-domain/        src/, package.json, eslint.config.mjs   (uses @UseCase decorator convention)
├── shipping-domain/      src/, package.json                       (JSDoc convention)
├── inventory-domain/     src/, package.json                       (custom decorators: @StockUseCase, ...)
├── payment-domain/       src/, package.json                       (interface-based: implements IUseCase)
├── notifications-domain/ src/, package.json                       (base class: extends BaseHandler)
├── bff/                  src/, package.json                       (mixed strategies)
├── ui/                   src/, package.json, vite.config.ts       (name-based: *Page suffix)
├── .riviere/
│   ├── config/
│   │   ├── extraction.config.json    (top-level, $refs the seven per-component configs)
│   │   ├── orders.extraction.json
│   │   ├── shipping.extraction.json
│   │   ├── inventory.extraction.json
│   │   ├── payment.extraction.json
│   │   ├── notifications.extraction.json
│   │   ├── bff.extraction.json
│   │   └── ui.extraction.json
│   └── graph.json                     (existing extracted graph)
├── scripts/
│   ├── verify-extraction.mjs          (existing fixture-verification harness)
│   ├── verify-connections.mjs
│   ├── update-living-architecture.mjs
│   ├── validate-dependencies.mjs
│   └── test-dependency-boundary.mjs
├── expected-extraction-output.json    (existing ground-truth: components per the current extraction)
├── expected-connections.json          (existing ground-truth: connections per the current extraction)
├── extraction-output.json             (current actual extraction output, regenerated each run)
├── enforcement-tdd.md                 (existing architectural-test documentation)
├── README.md                          (already documents the "6-step extraction workflow" concept)
├── pnpm-workspace.yaml
└── package.json
```

**Phase 13 additions to `ecommerce-demo-app` (gated by M0):**

| #   | Addition                                                             | Status before Phase 13                                                               | Phase 13 deliverable                                                                                                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `riviere-workflow.yaml`                                              | Does not exist                                                                       | New file at repo root; references existing `.riviere/config/extraction.config.json` via a single `code-extraction` step (the existing JSON config remains the authoritative extraction config — Phase 13 does not migrate it to YAML).                                                           |
| 2   | `specs/eventcatalog/`                                                | Does not exist                                                                       | New EventCatalog instance covering the cross-domain event flows (orders → shipping, payment, inventory, notifications). The EventCatalog SDK coverage spike (D0.3) lands here.                                                                                                                   |
| 3   | `specs/asyncapi.yaml`                                                | Does not exist                                                                       | New AsyncAPI v3 spec covering the broker channels and operations for the same flows.                                                                                                                                                                                                             |
| 4   | `specs/eventcatalog-import.yaml`, `specs/eventcatalog-mappings.yaml` | Does not exist                                                                       | New step config + mappings file.                                                                                                                                                                                                                                                                 |
| 5   | `specs/asyncapi-import.yaml`, `specs/asyncapi-mappings.yaml`         | Does not exist                                                                       | New step config + mappings file.                                                                                                                                                                                                                                                                 |
| 6   | `steps/ai-extract.yaml`, `steps/ai-enrich.yaml`                      | Does not exist                                                                       | New AI step configs (with structured `command` + `args` shell-out config per §3.4.1).                                                                                                                                                                                                            |
| 7   | `tests/workflow-transitions/NN-after-<step>.json`                    | Does not exist                                                                       | New per-step fixtures generated via the documented capture procedure (§3.8.3 fixture generation).                                                                                                                                                                                                |
| 8   | Workflow ground-truth fixture                                        | Partially present as `expected-extraction-output.json` / `expected-connections.json` | Phase 13 either (a) extends those existing fixtures to cover the full workflow output (recommended), or (b) introduces `tests/workflow-ground-truth.json` for the workflow-only assertion path, leaving the existing fixtures for `verify-extraction.mjs`. The choice is the demo-app PR's call. |
| 9   | Documented deliberate extraction gaps                                | Implicit in the existing code                                                        | Phase 13 PR enumerates the gaps in the README's "Phase 13 Workflow" section, mapping each gap to its expected AI-discovery outcome.                                                                                                                                                              |
| 10  | README "Phase 13 Workflow" section                                   | README documents the 6-step pre-Phase-13 extraction workflow concept                 | Phase 13 adds a new section showing the orchestrated workflow run end-to-end. Existing README content is preserved.                                                                                                                                                                              |

**What Phase 13 does NOT change in `ecommerce-demo-app`:**

- The five domain codebases, BFF, UI, and their existing source code.
- `.riviere/config/extraction.config.json` and the seven per-component JSON configs — these remain the authoritative extraction configs and are referenced as-is by the new `riviere-workflow.yaml` via a single `code-extraction` step.
- `expected-extraction-output.json`, `expected-connections.json`, `extraction-output.json`, and the existing `scripts/verify-*.mjs` harnesses — these continue to validate the deterministic extraction path independently of the workflow.
- The existing README pre-Phase-13 content (the deterministic extraction setup guide is preserved verbatim).

**Integration contract:**

- The `ecommerce-demo-app` repository is pinned to a specific commit SHA from `living-architecture`'s CI. When Phase 13 changes require a corresponding demo-app update, both repos land as a coordinated pair with matching PRs; the pinned SHA in `living-architecture` bumps after the demo-app PR merges.
- Phase 13 integration tests clone the demo-app repo at the pinned SHA into a CI-local directory and run `riviere workflow run` against the cloned `riviere-workflow.yaml`.
- Fixture comparison (workflow ground truth + transition fixtures) is driven by the demo-app repo's JSON files, not by copies stored in `living-architecture`.
- Schema or behaviour changes in Phase 13 that invalidate the demo-app fixtures require a coordinated PR to the demo-app repo regenerating fixtures; CI fails until the pinned SHA catches up.

#### 3.8.1 Ecommerce Demo App Is the First Workflow Customer

`ecommerce-demo-app` is not just a test fixture. It is the first real workflow customer and must use the same workflow concepts that a product user would use in a real repository.

The demo app workflow exercises the full built-in workflow surface in one ordered run:

```yaml
# ecommerce-demo-app/riviere-workflow.yaml
apiVersion: v1
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
  inventory:
    description: Stock reservation and replenishment
    systemType: domain
  payment:
    description: Payment authorisation and settlement
    systemType: domain
  notifications:
    description: Customer notification fan-out
    systemType: domain
  bff:
    description: Backend-for-frontend aggregating domain APIs
    systemType: bff
  ui:
    description: Customer-facing web UI
    systemType: ui

steps:
  - name: extract-code
    type: code-extraction
    # The existing top-level extraction config $refs all seven per-component configs;
    # one workflow step covers every domain + bff + ui without re-listing them here.
    config: ./.riviere/config/extraction.config.json

  - name: import-eventcatalog
    type: eventcatalog-import
    config: ./specs/eventcatalog-import.yaml

  - name: import-asyncapi
    type: asyncapi-import
    config: ./specs/asyncapi-import.yaml

  - name: discover-gaps
    type: ai-extract
    config: ./steps/ai-extract.yaml

  - name: enrich-metadata
    type: ai-enrich
    config: ./steps/ai-enrich.yaml

  - name: validate
    type: schema-validate
```

The `code-extraction` step references the existing `extraction.config.json` directly. Phase 13 explicitly does **not** migrate the demo app's JSON extraction configs to YAML; the extract-config schema accepts both, and the existing files continue to drive `verify-extraction.mjs` independently.

This workflow is the reference ordering for Phase 13 (last-wins, highest-priority-last):

- code first so deterministic extraction seeds the graph with the full set of code-discovered components and links
- spec imports second so spec-owned scalar values overwrite any code-derived values on the same components (specs are the authoritative source of truth for what they cover)
- AI last so it only adds missing components/links and fills strictly-unset scalar fields without competing with deterministic sources

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
command: claude
args: ['-p']
timeout-seconds: 600
memory: ./steps/ai-memory.md
prompt-append: ./steps/ai-extract.instructions.md

sources:
  - ./orders-domain/src
  - ./shipping-domain/src
  - ./inventory-domain/src
  - ./payment-domain/src
  - ./notifications-domain/src
  - ./bff/src
  - ./ui/src

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
```

```yaml
# steps/ai-enrich.yaml
command: claude
args: ['-p']
timeout-seconds: 600
memory: ./steps/ai-memory.md
prompt-append: ./steps/ai-enrich.instructions.md

sources:
  - ./orders-domain/src
  - ./shipping-domain/src
  - ./inventory-domain/src
  - ./payment-domain/src
  - ./notifications-domain/src
  - ./bff/src
  - ./ui/src

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
    - inventory
    - payment
    - notifications
    - bff (systemType: bff)
    - ui  (systemType: ui)

components: []
links: []
externalLinks: []
```

##### Step 1 — `extract-code`

Loads:

- `./.riviere/config/extraction.config.json` (existing top-level extraction config; `$ref`s the seven per-component configs)
- TypeScript files matched by every per-component config (orders, shipping, inventory, payment, notifications, bff, ui)

Reads:

- deterministic component extraction rules across every domain and the bff/ui components
- deterministic metadata extraction rules per the per-component configs
- deterministic connection rules and configurable connection patterns from the top-level `connections` block

Modifies builder by:

- adding code components from every domain (UI, API, UseCase, DomainOp, Event, EventHandler, Custom) with code-derived scalar values
- adding deterministic sync and async links discovered across the entire workspace
- emitting unresolved incomplete-state diagnostics in lenient mode where deterministic extraction couldn't fully resolve a field or confidently confirm a link (per §3.5.2)

Representative transition:

```text
before:
  components: []
  links: []

after:
  components include:
    - orders/PlaceOrder (UseCase)
    - orders/OrderPlaced (Event)
    - shipping/ShipOrder (UseCase)
    - shipping/OrderShipped (Event)
    - inventory/ReserveStock (UseCase)
    - inventory/StockReserved (Event)
    - payment/AuthorisePayment (UseCase)
    - payment/PaymentAuthorised (Event)
    - notifications/SendOrderConfirmation (EventHandler)
    - bff/* (APIContainer entry points aggregating domain APIs)
    - ui/* (Page-suffixed UI components)

  links include:
    - sync links across each domain's API -> UseCase -> DomainOp chains
    - sync links bff -> domain APIs
    - sync links ui Pages -> bff
    - async links between cross-domain producers and consumers where deterministically resolvable
```

##### Step 2 — `import-eventcatalog`

Loads:

- `./specs/eventcatalog`
- `./specs/eventcatalog-mappings.yaml`

Reads:

- EventCatalog domains
- EventCatalog services
- EventCatalog events
- producer/consumer relationships

Modifies builder by:

- upserting canonical service-backed UseCase components — any scalar fields (e.g. `description`) set by code are **overwritten** with EventCatalog-authoritative values (last-wins)
- upserting canonical Event components such as `OrderPlaced` — spec scalars overwrite code scalars; arrays union
- adding EventHandler components for consumers where required by the mapping model (creates new when absent)
- adding async links from producers to events and events to handlers (dedup on `(source, target, type)` tuple)

Representative transition:

```text
before:
  orders/PlaceOrder (UseCase) with code-derived description "place an order"
  orders/OrderPlaced (Event) with code-derived description and eventName

after:
  orders/PlaceOrder description overwritten with EventCatalog spec description
  orders/OrderPlaced description overwritten with spec description
  no duplicate components (upsert merges on canonical ID)
  new async links added if EventCatalog describes flows code missed
```

##### Step 3 — `import-asyncapi`

Loads:

- `./specs/asyncapi.yaml`
- `./specs/asyncapi-mappings.yaml`

Reads:

- AsyncAPI messages
- AsyncAPI publish operations
- AsyncAPI receive operations

Modifies builder by:

- upserting canonical Event components for broker messages (overwrites scalars when AsyncAPI contributes them)
- upserting publisher/subscriber-side canonical components for operations
- adding async links where AsyncAPI describes message flow (dedup on tuple)

Representative transition:

```text
before:
  EventCatalog has already made its contribution; code-derived scalars on shared events are overwritten

after:
  AsyncAPI resolves OrderPlacedMessage -> OrderPlaced
  AsyncAPI resolves processOrder -> ProcessOrder
  broker-described scalars (e.g. payload schemas in metadata) overwrite prior values on the same fields
  additional broker-described async links are added if missing
```

##### Step 4 — `discover-gaps`

Loads:

- `./steps/ai-extract.yaml`
- bounded source batches from every domain + bff + ui (per `sources` in the step config)
- current builder state via `builder.query()` plus unresolved workflow diagnostics (§3.5.1 / §3.5.2)

Reads:

- only files allowed by the AI extract config
- only gap categories listed in `selection.from`
- only unresolved incomplete-state diagnostics relevant to those gap categories

Modifies builder by:

- calling the typed `upsert*` method with `{ noOverwrite: true }` for each missing component returned by the CLI — creates new components; collisions with existing ones are logged and skipped (no scalar overwrite)
- adding missing links returned by the CLI (dedup on tuple)
- emitting structured log events for AI-applied additions (no confidence score)

Representative transition:

```text
before:
  deterministic extraction leaves known deliberate gaps

after:
  builder gains only gap-targeted additions, for example:
    - an event inferred from dynamic config lookup
    - a missing handler link hidden behind runtime wiring

  each AI-added component/link is visible through structured workflow log events
```

##### Step 5 — `enrich-metadata`

Loads:

- `./steps/ai-enrich.yaml`
- bounded source files near components with unresolved `missing-field` diagnostics or configured unset fields
- current builder state via `builder.query()` plus unresolved workflow diagnostics (§3.5.1 / §3.5.2)

Modifies builder by:

- calling the typed `upsert*` method with `{ noOverwrite: true }`, supplying only the configured enrichable fields — under `noOverwrite`, already-set scalars are preserved; only `undefined`/`null` fields receive the AI-proposed value
- emitting structured log events for AI-applied enrichments (no confidence score)

Representative transition:

```text
before:
  component fields may still contain gaps such as:
    - missing subscribedEvents
    - missing operationName
    - missing route/path details

after:
  those fields are filled from the CLI response (no threshold filtering)
  already-set scalars preserved (noOverwrite)
```

##### Step 6 — `validate`

Loads:

- no extra config beyond the step declaration

Reads:

- current builder state only

Modifies builder by:

- no graph mutation

Validation effect:

```text
builder.validate()
  -> returns ValidationResult (non-throwing)
  -> step inspects result, fails workflow if valid === false
  -> leaves builder state unchanged
```

Final output write still calls `builder.build()` as the terminal operation; `schema-validate` only provides the early-failure signal.

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

This final artifact is compared against the selected workflow ground-truth fixture (for example `tests/workflow-ground-truth.json` if option (b) is chosen) for exact component ID and link tuple coverage.

#### 3.8.3 Demo App Validation Use

The ecommerce demo app must validate three things at once:

1. **Product realism** — a user can understand the workflow YAML and step configs as a believable first customer setup
2. **Execution correctness** — each step changes builder state in the expected direction and order
3. **Regression safety** — the full workflow remains idempotent and comparable to a fixed ground truth

To make the step-by-step behavior testable, the demo app also maintains per-step transition fixtures. Each fixture captures the **exact** expected builder graph after one step completes, before the next step begins — the fixture is not representative sketching but a reproducible snapshot. Implementation can then verify:

- workflow startup builder creation
- each step's additive or enriching effect on the graph
- that no later step accidentally mutates earlier deterministic data outside the defined merge rules
- that `schema-validate` is non-mutating

**Fixture generation procedure (mandatory for D0.8):** Fixtures are generated by instrumenting a known-good workflow run with a transition-capture hook that serialises `builder.query().components()`, `builder.query().links()`, and `builder.query().externalLinks()` after each step, writing to `tests/workflow-transitions/NN-after-<step-name>.json`. The hook is part of the `ecommerce-demo-app` repo tooling, not of Riviere itself. Regenerating a fixture requires a known-good run (the author confirms the graph state is correct), then committing the new fixture JSON — never editing fixtures by hand.

**Exact-match assertion:** Integration tests comparing a live run's builder state against a fixture use set-equality on component IDs and `(source, target, type)` link tuples. In addition, targeted semantic assertions check the high-value Phase-13 behaviours (spec-overwrite fields, additive-only AI behaviour, and diagnostic-log output).

**Graph comparison semantics:**

- Fixtures are captured by serialising `builder.query().components()`, `builder.query().links()`, and `builder.query().externalLinks()` after each step — no new API is introduced, the existing read surface (§3.5.1) is authoritative.
- Components compared by ID (exact match on full set — no extra, no missing)
- Links compared by (source, target, type) tuple (exact match on full set)
- Selected semantically important fields are asserted explicitly in dedicated integration tests (e.g. spec-owned descriptions, AsyncAPI-contributed fields, and fields AI enrichment is expected to fill)
- Structured workflow-log events are asserted explicitly in dedicated integration tests (e.g. scalar overwrites, duplicate-link skips, import skipped-records, AI additions/enrichments)

**Workflow idempotency — split by step type:**

- **Deterministic-only workflows** (no `ai-extract`, no `ai-enrich`): idempotency is **mandatory and CI-verified**. Running the same workflow twice against unchanged inputs must produce byte-equal output JSON under canonical serialisation. This is success criterion #13a, gated by CI.
- **Workflows with AI steps**: idempotency is **not in Phase 13 scope**. AI CLI invocations are non-deterministic unless the user's CLI itself provides pinned-runtime controls (model/version pinning, deterministic inference settings, replayable prompt inputs) — and Phase 13 does not ship or require any such controls. The demo workflow's idempotency test runs under `--skip-ai` (AI steps skipped); the AI-included variant is excluded from CI idempotency assertions and documented as criterion #13b — deferred, with a manual verification procedure published for teams whose CLI provides those controls.

### 3.9 Diagnostics

Failure diagnostics and cross-step observability are first-class concerns. Workflows with 6+ steps, multiple spec sources, and AI involvement produce diagnostics that users must be able to act on.

**Single diagnostic artefact:** every workflow run writes a structured NDJSON log to `<workflow-output-dir>/workflow.log.ndjson` where `<workflow-output-dir>` is the parent directory of the workflow `output` path. The runtime auto-creates the directory as needed. The final graph JSON remains a separate artefact written only on successful completion. On failure, the log remains available and the final graph is not written. Each run replaces the prior log for that workflow output location.

**Stable log envelope:** every NDJSON line conforms to a discriminated-union schema in `riviere-extract-config` with fixed envelope fields (`runId`, `timestamp`, `eventType`, optional `step`, optional `stepType`, `payload`). Step-specific event shapes extend this envelope through the `payload` field so future log-parsing commands can rely on a stable base contract.

**3.9.1 Step-contextualised builder errors.** Builder errors (`DuplicateComponentError`, `ComponentTypeMismatchError`, missing-referent errors, etc.) are raised deep inside `riviere-builder`. When they surface to a step, the step handler catches them and re-throws with step-level context attached: the step `name`, step `type`, source record identifier where known (e.g. EventCatalog service id, AsyncAPI operation id, code location for `code-extraction`), and the mapping file + line when a mapping file caused the collision. Example:

```text
Step 'import-eventcatalog' (eventcatalog-import) failed:
  ComponentTypeMismatchError at component ID 'orders:checkout:Event:orderplaced'
  (existing type: UseCase, incoming type: Event)
  Source record: EventCatalog event 'OrderCreated'
  Mapping file: ./specs/eventcatalog-mappings.yaml
  Mapping line: 14 (events.OrderCreated.name: 'OrderPlaced')
  Hint: another mapping or code-extraction step created a UseCase with the
        same canonical identity. Check the mapping `name` field and the
        code extracted into this domain/module.
```

Every built-in step handler catches the builder-error surface and decorates in this style; the same structured error is emitted into the workflow log. Step-contract doc calls this out as a requirement for third-party step authors too.

**3.9.2 Scalar-conflict observability.** Under last-wins scalar merge (§3.5), an incoming scalar write that **overwrites** an existing value is a silent data-loss path. The builder emits a structured diagnostic (`BuilderWarning` with type `'scalar-overwrite'`) for every such write, accessible via `builder.warnings()` after the step. Each workflow step logs its `.warnings()` delta at step-completion time and includes the count in the step summary (`extract-shipping: imported 42 components, 3 scalar overwrites — see workflow.log.ndjson`). Every warning is also written as an NDJSON event in the single workflow log:

```json
{
  "runId": "2026-04-14T12:34:56Z#ecommerce-architecture",
  "timestamp": "2026-04-14T12:34:56Z",
  "eventType": "scalar-overwrite",
  "step": "import-eventcatalog",
  "stepType": "eventcatalog-import",
  "payload": {
    "componentId": "orders:checkout:Event:orderplaced",
    "field": "description",
    "oldValue": "place an order",
    "newValue": "Order has been placed by customer"
  }
}
```

`noOverwrite: true` writes that preserve an existing scalar do **not** emit a warning (they are expected behaviour for AI steps). Only real overwrites do. This gives users a discoverable, diffable signal when a later step wins a scalar conflict, closing the "why did my code description disappear?" gap.

**3.9.3 Workflow-level summary.** At workflow completion, the runtime prints a single summary block:

```text
Workflow 'ecommerce-architecture' completed in 47.2s
  extract-orders         2.1s    imported 18 components, 24 links
  extract-shipping       1.8s    imported 11 components, 16 links
  import-eventcatalog    0.8s    imported 12, skipped 0         (3 scalar overwrites)
  import-asyncapi        0.6s    imported 8, skipped 2          (see workflow.log.ndjson)
  discover-gaps          9.4s    added 3 components, 5 links
  enrich-metadata       31.2s    filled 14 fields
  validate               1.3s    OK
  Output: ./.riviere/architecture.json
  Log:    ./.riviere/workflow.log.ndjson
```

No new API for this; it composes the existing step logger + `builder.warnings()` + import-summary counters (§3.4.2) + the structured diagnostic sink. Documented explicitly so the implementation produces the expected format.

## 4. What We're NOT Building

Phase 13 is intentionally narrow. The exclusions below centralize the scope boundaries that appear throughout the detailed design so implementation planning has one authoritative out-of-scope list.

| Exclusion                                                                                            | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Changes to deterministic extraction behaviour itself**                                             | The `code-extraction` refactor is structural only. Phase 13 reuses the existing extraction pipeline; it does not redesign extraction rules, detection semantics, or metadata behaviour.                                                                                                                                                                                                                                                                                                                          |
| **User plugin loading**                                                                              | Phase 13 exports the step contract and uses a registry-based runtime, but does not load user-created plugin packages yet. Built-in steps only in this phase.                                                                                                                                                                                                                                                                                                                                                     |
| **Parallel step execution**                                                                          | Steps run sequentially. Parallelization is an optimization for later if needed.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **TypeScript workflow definitions**                                                                  | YAML + JSON Schema for now. TypeScript config files are a future option for teams wanting type safety and composability.                                                                                                                                                                                                                                                                                                                                                                                         |
| **Workflow state / caching between runs**                                                            | Each run is stateless — produces a complete graph from scratch. Incremental extraction deferred.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Per-step checkpointing / `--only` single-step rerun**                                              | No builder rehydration from a prior output graph, no checkpoint store, no `--only` flag to re-run a single step. The inner dev-iteration loop for workflow authors is "edit config, re-run full workflow." Deterministic steps are fast; AI cost is the CLI's concern (user's own session caching handles repeated prompts where applicable). Can be revisited in a later phase if the full-rerun cost becomes a real adoption blocker.                                                                          |
| **OpenAPI, GraphQL, Protobuf, Backstage importers**                                                  | Phase 13 includes EventCatalog and AsyncAPI (provide connection data). Component-only importers are lower value, deferred.                                                                                                                                                                                                                                                                                                                                                                                       |
| **Cross-repo linking**                                                                               | Phase 14 scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Cross-repo workflow orchestration**                                                                | Phase 14 will define how multi-repo graphs are built.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Generic workflow engine features**                                                                 | No conditionals, loops, branching, retry policies, continue-on-error, or DAG execution. Sequential steps only.                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Workflow composition**                                                                             | Workflows cannot reference or import other workflows.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Workflow migration tooling and auto-wiring existing configs**                                      | Phase 13 ships the `apiVersion: v1` marker on every workflow file and validates it at load time, but does **not** ship automated migration tooling, automatic detect-and-wire of existing extraction configs, or automatic conversion of current `riviere extract` usage into workflows. Existing-config detection prints a ready-to-copy AI-assistant migration prompt instead of attempting conversion. Future breaking changes will bump to `v2` and a migration path will be designed when that need arises. |
| **Step rollback / partial success**                                                                  | If a step fails, the workflow aborts entirely. No partial final graph, no undo. The workflow log may still contain events from steps completed before the failure.                                                                                                                                                                                                                                                                                                                                               |
| **Multi-output workflows**                                                                           | One workflow produces one output file. Multiple formats or artifacts require separate workflows.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Generic step timeout / resource limits**                                                           | No generic per-step time or memory limits beyond the explicit AI-step `timeout-seconds` control in §3.4.1.                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Workflow execution history / audit**                                                               | No tracking of when workflows ran or what changed between runs.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **AsyncAPI request/reply, channel/infrastructure modelling, and broader AsyncAPI semantics**         | Phase 13 supports AsyncAPI v3 publish/subscribe only. Broker infrastructure is dropped, and request/reply is explicitly rejected rather than partially modelled.                                                                                                                                                                                                                                                                                                                                                 |
| **EventCatalog fallback parser if the SDK proves insufficient**                                      | M0 contains a gating SDK spike. If the SDK cannot supply the required relationships, Phase 13 stops rather than introducing a parallel parser path.                                                                                                                                                                                                                                                                                                                                                              |
| **AI SDK dependency, token / cost / rate-limit management, secret loading, retries, prompt caching** | Phase 13 ships zero AI infrastructure. AI steps shell out to a user-configured CLI (§3.4.1). Auth, cost, tokens, rate limits, retries, and caching are the CLI binary's concern — Riviere never touches credentials and makes no SDK dependency.                                                                                                                                                                                                                                                                 |
| **Automated AI review-and-accept loop**                                                              | Phase 13 does not add a second-pass review loop that automatically accepts or persists AI suggestions. Corrections live in workflow and step config files, edited by the user between runs.                                                                                                                                                                                                                                                                                                                      |
| **Full prompt replacement, confidence scoring, and threshold-based AI filtering**                    | Users can append instructions and memory, but Phase 13 does not expose arbitrary prompt replacement or any confidence/threshold control surface. AI responses either validate and apply additively or the step fails.                                                                                                                                                                                                                                                                                            |
| **Pinned-runtime AI idempotency tooling**                                                            | Phase 13 does not ship tooling for deterministic AI execution (pinned model/version, deterministic inference settings, prompt-replay). AI-inclusive workflow idempotency (criterion #13b) is therefore deferred; only deterministic-only idempotency (criterion #13a) is CI-gated. A manual verification procedure is published for teams operating their own pinned runtimes.                                                                                                                                   |

---

## 5. Success Criteria

| #   | Criterion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Verification                                                                                                                                                                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Workflow engine executes steps sequentially, passing shared builder between steps                                                                                                                                                                                                                                                                                                                                                                                                                   | Unit tests for engine with mock step handlers                                                                                                                                                                                                                                                                                                                                       |
| 2   | Workflow creates the builder eagerly from workflow `name`, `description`, `sources`, and `domains`, with `output` passed as the graph path argument, before executing steps                                                                                                                                                                                                                                                                                                                         | Integration test for workflow startup with multiple built-in step types                                                                                                                                                                                                                                                                                                             |
| 3   | `eventcatalog-import` maps EventCatalog data to the obvious internal Riviere concepts needed in Phase 13 via builder, using convention-based defaults                                                                                                                                                                                                                                                                                                                                               | Integration test against demo app EventCatalog                                                                                                                                                                                                                                                                                                                                      |
| 4   | `asyncapi-import` maps AsyncAPI v3 spec to the obvious internal Riviere concepts needed in Phase 13 via builder                                                                                                                                                                                                                                                                                                                                                                                     | Integration test against demo app AsyncAPI spec                                                                                                                                                                                                                                                                                                                                     |
| 5   | Builder ships one typed `upsert*` method per component type (`upsertUI`, `upsertApi`, `upsertUseCase`, `upsertDomainOp`, `upsertEvent`, `upsertEventHandler`, `upsertCustom`) with `{ noOverwrite?: boolean }` option, applying last-wins scalar merge by default and preserve-existing-scalar under `noOverwrite`; dedupes links on `(source, target, type)` with duplicate attempts logged; makes `addDomain()` / `addSource()` idempotent                                                        | Unit tests in riviere-builder covering last-wins scalar merge, `noOverwrite` preservation, array union, type mismatch, link dedup/no-op duplicate behaviour, duplicate-link logging, and `addDomain`/`addSource` idempotency                                                                                                                                                        |
| 6   | `ai-extract` discovers components/connections that deterministic extraction missed and applies them additively without overwriting existing scalars                                                                                                                                                                                                                                                                                                                                                 | Integration test against demo app deliberate gaps and structured log assertions for applied AI additions                                                                                                                                                                                                                                                                            |
| 7   | `ai-enrich` fills missing metadata fields additively without overwriting already-set scalars                                                                                                                                                                                                                                                                                                                                                                                                        | Integration test against demo app components with unresolved missing-field diagnostics / unset enrichable fields plus structured log assertions for applied AI enrichments                                                                                                                                                                                                          |
| 8   | `riviere workflow run` produces valid graph from demo app workflow matching ground truth, with targeted semantic assertions covering spec-overwrite fields, additive-only AI behaviour, and diagnostic-log events                                                                                                                                                                                                                                                                                   | End-to-end test: zero false positives / negatives on component IDs and link tuples plus targeted semantic assertions on selected field values and workflow-log events                                                                                                                                                                                                               |
| 9   | `riviere workflow init` produces valid workflow YAML and step configs                                                                                                                                                                                                                                                                                                                                                                                                                               | Init creates files, `workflow validate` passes, `workflow run` succeeds                                                                                                                                                                                                                                                                                                             |
| 10  | `riviere workflow validate` catches invalid workflow files, missing config references, incompatible step-declared domains/sources, invalid step configs, and unresolved runtime prerequisites from `requiredServices()` (notably: the AI CLI executable not being in `PATH`); `workflow run` skips AI file-existence checks, AI config validation, and AI prerequisite checks for `--skip-ai`, and skips AI prerequisite checks for `--dry-run` steps that will not invoke a CLI                    | Unit tests for structural, semantic, and runtime-prerequisite validation; explicit tests that `workflow validate` fails on a non-existent AI CLI executable while `workflow run --skip-ai` ignores AI config/prerequisite failures and `--dry-run` does not require the AI CLI executable                                                                                           |
| 11  | Workflow JSON Schema validates workflow file structure                                                                                                                                                                                                                                                                                                                                                                                                                                              | Schema tests in `riviere-extract-config` accept documented valid examples and reject missing/invalid structural fields                                                                                                                                                                                                                                                              |
| 12  | `riviere-workflow` exports the step contract and resolves built-in steps through a registry rather than hardcoded switch logic                                                                                                                                                                                                                                                                                                                                                                      | Unit tests for step registry + dependency-cruiser rule enforcement                                                                                                                                                                                                                                                                                                                  |
| 13a | Workflows with **only deterministic steps** (no `ai-extract`, no `ai-enrich`) are bit-for-bit idempotent: running twice produces identical output JSON (after canonical-serialisation normalisation)                                                                                                                                                                                                                                                                                                | E2E test in CI: demo workflow with AI steps disabled, run twice, assert byte-equal output JSON. Mandatory gate.                                                                                                                                                                                                                                                                     |
| 13b | Workflows with AI steps are idempotent **only under pinned-runtime conditions** (pinned model/version, deterministic inference controls, replayable prompt inputs). Phase 13 does not ship pinned-runtime tooling; this criterion is explicitly deferred                                                                                                                                                                                                                                            | Documented as not-in-scope; no CI gate. A manual verification procedure is published so teams with pinned runtimes can self-verify.                                                                                                                                                                                                                                                 |
| 14  | AI step configs validate structured `command`/`args`, optional `memory` / `prompt-append`, and bounded enum-based selection and field lists rather than free-form strings                                                                                                                                                                                                                                                                                                                           | Schema validation tests in `riviere-extract-config`                                                                                                                                                                                                                                                                                                                                 |
| 15  | Canonical identity normalization happens in step config/mappings, not in the workflow runtime                                                                                                                                                                                                                                                                                                                                                                                                       | Integration test: differently named external records merge only when mappings normalize them to the same Riviere identity                                                                                                                                                                                                                                                           |
| 16  | `schema-validate` works as an optional explicit checkpoint while final output still always validates                                                                                                                                                                                                                                                                                                                                                                                                | Integration test with and without `schema-validate` step                                                                                                                                                                                                                                                                                                                            |
| 17  | Step summary output shows per-step duration and total workflow duration                                                                                                                                                                                                                                                                                                                                                                                                                             | Golden-output integration test asserts the summary block includes total duration plus one duration-bearing line per executed step                                                                                                                                                                                                                                                   |
| 18  | The documented ecommerce demo app workflow transitions are verified after each step, not only at final output                                                                                                                                                                                                                                                                                                                                                                                       | Integration test compares builder state after each step to `tests/workflow-transitions/*.json` fixtures                                                                                                                                                                                                                                                                             |
| 19  | Every Phase 13 schema (workflow YAML, step configs, mapping files, builder inputs) rejects empty strings on all string fields via `minLength: 1` or equivalent                                                                                                                                                                                                                                                                                                                                      | Schema-level tests assert that `""` on every string field produces a validation error                                                                                                                                                                                                                                                                                               |
| 20  | Workflow runtime preserves incomplete-state diagnostics outside `riviere-schema`; final graphs never contain `_missing` / `_uncertain`; `builder.build()` fails while unresolved `missing-field` / `uncertain-link` diagnostics remain                                                                                                                                                                                                                                                              | Unit tests for extract-ts draft-marker to runtime-diagnostic conversion, resolution tracking, `builder.validate()` reporting, and `builder.build()` failure on unresolved diagnostics                                                                                                                                                                                               |
| 21  | Steps can access workflow diagnostics through `StepContext.diagnostics` (read unresolved diagnostics, emit structured log events, report/resolve workflow-only diagnostics); `RiviereQuery` remains unchanged and does not gain draft-only helper methods                                                                                                                                                                                                                                           | Unit tests for diagnostics contract plus integration tests that AI steps consume unresolved diagnostics and deterministic steps emit/resolve diagnostics without extending `riviere-query`                                                                                                                                                                                          |
| 22  | `ai-extract` gap categories (`uncertain-links`, `missing-events`, `missing-event-handlers`, `missing-use-cases`) each have a documented computation rule and a passing test                                                                                                                                                                                                                                                                                                                         | Integration tests assert each gap category produces the expected candidate set against demo-app fixtures                                                                                                                                                                                                                                                                            |
| 23  | `schema-validate` uses `builder.validate()` (non-throwing) so it can surface malformed graph state and unresolved incomplete-state diagnostics without mutating builder state before the step fails                                                                                                                                                                                                                                                                                                 | Integration test: insert `schema-validate` mid-workflow, assert it reports validation errors including unresolved diagnostics and leaves builder state unchanged                                                                                                                                                                                                                    |
| 24  | `riviere-extract-ts` exposes a pure `extractInto(writePort, config, options)` core that writes through a caller-supplied port without writing JSON; `riviere extract` CLI is rewritten as a thin shell over this core using a strict direct-CLI write-port adapter; existing CLI behaviour is unchanged                                                                                                                                                                                             | Unit tests for the pure core and both write-port adapters; existing `riviere extract` integration tests pass against the refactored CLI with no change in output JSON                                                                                                                                                                                                               |
| 25  | `code-extraction` workflow step calls the same pure core used by `riviere extract` CLI, but binds the merge-capable workflow write-port adapter so overlapping deterministic sources compose through builder upserts; same-step duplicate emission still fails; lenient-mode incomplete-state diagnostics are preserved in workflow diagnostics rather than graph schema                                                                                                                            | Integration test: running `riviere extract --config X` and running a workflow with a single `code-extraction` step using the same config produce identical component and link sets; duplicate emission within one extractor run still fails; a multi-step workflow with overlapping deterministic sources composes through upsert-backed writes without duplicate-component failure |
| 26  | ts-morph `Project` instances created during `code-extraction` are disposed before the step returns; multiple `code-extraction` steps in one workflow run do not retain compiler state between steps                                                                                                                                                                                                                                                                                                 | Memory-pressure test: run 5 `code-extraction` steps sequentially in one process; assert retained-heap after each step is bounded                                                                                                                                                                                                                                                    |
| 27  | `ecommerce-demo-app` repo (separate) satisfies all M0 deliverables in §7 plus the detailed M0 acceptance checklist in §3.7.1 D0.1–D0.10 before any other milestone can claim a §3.8-dependent success criterion                                                                                                                                                                                                                                                                                     | Cross-repo gate: `living-architecture` CI pins a commit SHA from `ecommerce-demo-app`; pinning requires M0 checklist sign-off in the demo-app PR                                                                                                                                                                                                                                    |
| 28  | Phase 13 integration and E2E tests fetch `ecommerce-demo-app` at the pinned SHA and run against it; no demo-app source or fixture lives in `living-architecture`                                                                                                                                                                                                                                                                                                                                    | Grep in `living-architecture` for demo-app source returns empty; CI test harness clones the demo-app at the pinned SHA                                                                                                                                                                                                                                                              |
| 29  | `eventcatalog-import.yaml`, `eventcatalog-mappings.yaml`, `asyncapi-import.yaml`, and `asyncapi-mappings.yaml` are all validated by JSON Schemas published in `riviere-extract-config`; step handlers' `validateConfig()` runs the schema check at `workflow validate` time                                                                                                                                                                                                                         | Schema tests: invalid shapes (typos on keys, empty strings, unknown top-level keys, missing required fields) fail `workflow validate`; valid demo-app mapping files pass                                                                                                                                                                                                            |
| 30  | `riviere workflow init` refuses to run when existing extraction configs are detected (for example `riviere-config.yaml` / `.yml`, `extraction.config.json` / `.yaml` / `.yml`, including `.riviere/config/`), prints the detected paths, emits a ready-to-copy AI-assistant migration prompt, and points to the migration guide; `docs/workflow/migrating-from-extract.md` is published and describes the five-step manual upgrade path                                                             | Integration test: run `init` in a directory with seeded existing extraction configs, assert non-zero exit, no files created, stderr names the detected config paths, migration-guide path, and AI-assistant prompt                                                                                                                                                                  |
| 31  | All path fields (in workflow YAML and in every step config file) are resolved relative to the directory of the file they appear in — never relative to `cwd`; a shared `resolveRelativeToConfig(configPath, rawPath)` utility is exported by `riviere-workflow` and used by every built-in step handler; `~` is not expanded                                                                                                                                                                        | Integration tests: run the demo workflow from two different working directories and assert identical output; unit tests for the resolver cover relative, absolute, backslash/forward-slash, and `~` cases                                                                                                                                                                           |
| 32  | Workflow YAML requires a top-level `apiVersion: v1` field; missing or unknown values fail `workflow validate` before any other structural check with the documented error message                                                                                                                                                                                                                                                                                                                   | Schema test: YAML without `apiVersion`, with `apiVersion: ""`, with `apiVersion: v2`, or with any other value all fail; `apiVersion: v1` passes                                                                                                                                                                                                                                     |
| 33  | AI steps (`ai-extract`, `ai-enrich`) invoke the configured CLI executable via a workflow-owned AI CLI adapter over `child_process.spawn` (`shell: false`), pass the prompt via stdin by default or a single `{prompt}` argv placeholder, capture stdout, validate it against the response schema in `riviere-extract-config`, enforce `timeout-seconds`, and apply results to the builder via typed `upsert*` with `{ noOverwrite: true }`. Riviere imports no AI SDK and reads no API-key env vars | Unit tests with mocked child_process behind the adapter; integration test with a tiny stub CLI script (echoes a canned JSON response) and assertion that Riviere depends on no AI SDK (`grep` in `riviere-workflow` package.json for `anthropic`/`openai`/`ai` SDK names returns empty); timeout test kills the child process                                                       |
| 34  | `riviere workflow run --dry-run` executes deterministic steps normally but skips every AI CLI invocation, printing the would-be prompt to stdout. `--skip-ai` skips AI steps entirely with no prompt construction. Both modes skip AI prerequisite checks for AI steps that will not invoke a CLI                                                                                                                                                                                                   | Integration tests: `--dry-run` produces prompts but no graph mutation from AI steps; `--skip-ai` produces deterministic-only output identical to an equivalent workflow with the AI steps removed, and neither mode requires the AI CLI to be installed                                                                                                                             |
| 35  | `steps[].name` is unique across the workflow, matches `^[a-z0-9-]+$`, and `minLength: 1`; duplicates and invalid characters fail structural validation with the documented error message                                                                                                                                                                                                                                                                                                            | Schema tests: duplicate names, uppercase names, names with spaces or underscores, and empty names all fail; compliant names pass                                                                                                                                                                                                                                                    |
| 36  | Lenient-mode `eventcatalog-import` / `asyncapi-import` runs emit a one-line `imported N, skipped M` summary in step logs and write structured skipped-record events into the NDJSON workflow log per the stable envelope in §3.9                                                                                                                                                                                                                                                                    | Integration test: seed a mapping file with some unresolvable records, run with `allow-unmapped: true`, assert the log line and NDJSON event contents match the documented schema; strict mode emits no skip-summary events                                                                                                                                                          |
| 37  | `asyncapi-import` consumes only the v3 fields listed in the exhaustive scope table (§3.4); drops infrastructure fields (servers, bindings, traits); fails validation on `operations.*.reply`; tolerates unrecognised top-level keys without failure                                                                                                                                                                                                                                                 | Spec-driven tests: a v3 spec with a reply operation fails; a spec with only publish/subscribe operations passes; dropped fields produce no warnings and no graph mutation                                                                                                                                                                                                           |
| 38  | All enum fields in Phase 13 schemas that exist in `riviere-schema` (notably `SystemType`, `ComponentType`, `LinkType`) are referenced via JSON Schema `$ref`, not redeclared                                                                                                                                                                                                                                                                                                                        | Schema tests: adding a new value to `SystemType` in `riviere-schema` is automatically accepted by workflow-validate without touching Phase 13 schemas                                                                                                                                                                                                                               |
| 39  | Builder errors surfaced through step handlers are decorated with step-level context (step name, type, source record id, mapping file + line where applicable) per §3.9.1                                                                                                                                                                                                                                                                                                                            | Integration tests trigger each built-in step's error paths (type mismatch, duplicate, unmapped) and assert the error message contains the required context fields                                                                                                                                                                                                                   |
| 40  | Every scalar overwrite under last-wins emits a `scalar-overwrite` `BuilderWarning` and a structured NDJSON workflow-log event using the stable envelope in §3.9; writes under `{ noOverwrite: true }` that preserve existing scalars do NOT warn                                                                                                                                                                                                                                                    | Unit tests for `BuilderWarning` emission; integration test asserts the NDJSON log event shape and that AI-step `noOverwrite` writes produce no warnings                                                                                                                                                                                                                             |
| 41  | `workflow run` prints a workflow-level summary block at completion per §3.9.3, including per-step duration, imported/skipped counts, scalar-overwrite counts, and the workflow-log path                                                                                                                                                                                                                                                                                                             | Golden-output integration test asserts the summary block format exactly                                                                                                                                                                                                                                                                                                             |
| 42  | Per-step transition fixtures in the demo-app repo are generated via the documented capture procedure (§3.8.3 fixture generation) by serialising `builder.query()` reads after each step — fixtures are never hand-edited                                                                                                                                                                                                                                                                            | Demo-app repo includes the capture-hook tooling and a CI check that regenerating fixtures against a known-good run produces identical files                                                                                                                                                                                                                                         |
| 43  | Workflow `output` is required (no default); missing or empty `output` fails structural validation                                                                                                                                                                                                                                                                                                                                                                                                   | Schema tests: workflow without `output` fails; `output: ""` fails; any non-empty string passes                                                                                                                                                                                                                                                                                      |
| 44  | `ai-extract` source-scope overflow (files > `max-files-per-batch * max-batches`) fails the step with the documented error — silent truncation is disallowed                                                                                                                                                                                                                                                                                                                                         | Integration test seeds a source tree with enough files to exceed the bound and asserts the step fails with the documented message                                                                                                                                                                                                                                                   |
| 45  | `riviere-workflow` package follows monorepo repository hygiene: separation-of-concerns folder structure, dependency-cruiser rules added to the root config, role-enforcement tags on every export, 100% test coverage, workspace-reference imports only, and explicit adapter isolation so only `platform/infra/external-clients` may import `@eventcatalog/sdk`, `@asyncapi/parser`, or Node `child_process`                                                                                       | Lint + dependency-cruiser + coverage gates green on CI, including rules that forbid vendor SDK/parser/process imports outside the adapter layer                                                                                                                                                                                                                                     |
| 46  | Architecture docs are updated for the workflow runtime boundary: `docs/architecture/overview.md` shows `riviere-workflow` in the package/dependency view, and a new ADR captures the registry runtime + shared-builder boundary                                                                                                                                                                                                                                                                     | Doc diff assertions confirm `overview.md` includes `riviere-workflow`, and a new ADR file is added describing the runtime boundary and builder ownership                                                                                                                                                                                                                            |
| 47  | Workflow/importer terminology and dependency docs are updated: the glossary includes workflow terms, and architecture docs mention `@eventcatalog/sdk` and `@asyncapi/parser`                                                                                                                                                                                                                                                                                                                       | Grep/doc assertions confirm glossary entries for `Workflow`, `Step Config`, `Mappings File`, and `Canonical Identity`, and confirm architecture docs mention both importer dependencies                                                                                                                                                                                             |
| 48  | Operator-facing docs capture the AI CLI shell-out boundary and deferred AI idempotency expectations without implying an SDK/auth surface in Riviere                                                                                                                                                                                                                                                                                                                                                 | Grep/doc assertions confirm docs state `command` + `args`, `child_process.spawn`, no AI SDK/auth handling in Riviere, and manual-only AI idempotency guidance                                                                                                                                                                                                                       |

---

## 6. Open Questions

None. Draft-phase questions were resolved before Planning. The remaining work is sequencing and delivery, not product-definition discovery.

---

## 7. Milestones

Phase 13 is in Planning. Detailed design remains in §3; this section is the delivery contract. The more granular M0 checklist in §3.7.1 D0.1–D0.10 remains the readiness gate for demo-app groundwork.

### M0: Demo app workflow baseline is ready

The demo app becomes a stable first-customer workflow fixture without breaking the existing deterministic extraction path.

#### Deliverables

- **D0.1:** Existing deterministic extraction path remains intact
  - Key scenarios: existing five domains plus `bff/` and `ui/` still build; existing extraction configs and fixtures remain authoritative; workflow additions do not alter direct-CLI behaviour.
  - Acceptance criteria: current `verify-extraction.mjs` / `verify-connections.mjs` continue to pass unchanged; existing extraction artifacts are preserved; `.riviere/config/extraction.config.json` remains the source of truth for direct extraction.
  - Verification: demo-app CI runs the current deterministic verification harness unchanged.
- **D0.2:** External specs and mappings exist and validate
  - Key scenarios: EventCatalog SDK spike succeeds; AsyncAPI v3 spec covers publish/subscribe only; mapping files normalize external records to canonical Riviere identities.
  - Acceptance criteria: `specs/eventcatalog/`, `specs/asyncapi.yaml`, and both mapping files exist; SDK and parser tests pass; schema tests pass for mapping files.
  - Verification: demo-app tests exercise `@eventcatalog/sdk`, `@asyncapi/parser`, and mapping schema validation.
- **D0.3:** Demo workflow and fixtures are reproducible
  - Key scenarios: root `riviere-workflow.yaml` references the existing extraction config; workflow ground truth exists; transition fixtures are generated from a capture hook rather than hand-edited.
  - Acceptance criteria: `riviere workflow validate` passes against the demo repo; ground-truth strategy is documented; transition fixtures exist for every step.
  - Verification: run `workflow validate`, run the fixture-capture tooling, and assert a clean fixture diff in CI.
- **D0.4:** Inter-repo contract and README updates land
  - Key scenarios: `living-architecture` pins a demo-app SHA; coordinated fixture updates have an explicit path; README adds a Phase 13 workflow section without removing the current deterministic guide.
  - Acceptance criteria: pinned SHA and dependency-update process exist; README preserves pre-Phase-13 guidance verbatim and adds workflow guidance as the next step.
  - Verification: grep/assertions confirm the pinned SHA is referenced by CI config, the coordination template/file exists, and the demo-app README contains both the preserved deterministic guide and the new Phase 13 workflow section.

### M1: Workflow engine and shared builder are in place

The runtime can load a workflow, validate the active plan, and execute sequential steps against one shared builder facade.

#### Deliverables

- **D1.1:** Registry-based workflow runtime executes validated plans
  - Key scenarios: sequential execution, active-plan derivation for `--skip-ai` / `--dry-run`, fail-fast validation before execution.
  - Acceptance criteria: built-in steps resolve via registry; workflow abort semantics are consistent; shared builder is created once after active-step validation succeeds.
  - Verification: runtime integration tests with mock handlers and mixed execution plans.
- **D1.2:** Builder supports multi-source graph construction
  - Key scenarios: typed `upsert*` merge on same canonical ID, `noOverwrite` preservation for AI callers, idempotent `addSource()` / `addDomain()`, duplicate-link logging.
  - Acceptance criteria: builder exposes the seven typed `upsert*` methods; merge and dedup semantics match §3.5.
  - Verification: unit tests in `riviere-builder` for merge, warning, and dedup behaviour.
- **D1.3:** `code-extraction` reuses a pure core through explicit write-port adapters
  - Key scenarios: pure `extractInto(writePort, config, options)` core exists; direct CLI binds the strict adapter and preserves current output; workflow binds the merge-capable adapter; same-step duplicate emission still fails; lenient draft markers become workflow diagnostics instead of graph fields.
  - Acceptance criteria: `riviere extract` remains output-compatible; workflow single-step parity with direct extract is proven; same-step duplicates still fail; overlapping deterministic workflow steps compose through upsert-backed writes without duplicate-component failure.
  - Verification: parity integration tests, same-step duplicate detection tests, overlapping-source workflow tests, plus memory/resource-disposal tests for repeated extraction steps.
- **D1.4:** Architecture documentation is updated for the new runtime boundary
  - Key scenarios: architecture overview shows the new package boundary, a dedicated ADR records the runtime decision, and glossary terms exist for the workflow runtime surface.
  - What doc to update and why: update `docs/architecture/overview.md` to show `riviere-workflow` in the package graph; add an ADR capturing the registry runtime + shared-builder boundary; update glossary entries for workflow runtime terms.
  - Acceptance criteria: `overview.md` explicitly shows `riviere-workflow`; a new ADR file exists for the workflow runtime boundary; glossary additions cover workflow runtime terms introduced by Phase 13.
  - Verification: doc diff assertions confirm the updated package diagram, presence of the ADR file, and the required glossary entries.
- **D1.5:** Workflow schema and package foundations are strict by default
  - Key scenarios: workflow schema enforces `apiVersion`, required `output`, unique/patterned step names, and empty-string rejection; file-relative path resolution is reusable across built-in steps; `riviere-workflow` obeys repo hygiene rules.
  - Acceptance criteria: schema tests cover structural validation rules; resolver tests prove file-relative path behaviour; dependency-cruiser, role-enforcement, coverage, and workspace-import gates apply to the new package; vendor SDK/parser/process imports are confined to `platform/infra/external-clients`.
  - Verification: schema test suite, resolver unit tests, and CI lint/dependency-cruiser/coverage assertions, including import-boundary rules for the adapter layer.

### M2: Deterministic spec and validation steps work end-to-end

Users can combine deterministic code extraction with spec imports and an explicit validation checkpoint.

#### Deliverables

- **D2.1:** `eventcatalog-import` works with convention defaults and mappings overrides
  - Key scenarios: canonical identity normalization, strict vs lenient unmapped handling, producer/consumer link creation.
  - Acceptance criteria: demo EventCatalog imports into the shared builder and logs skipped records only in lenient mode.
  - Verification: integration tests against the demo EventCatalog plus schema tests for step and mapping files.
- **D2.2:** `asyncapi-import` works within the defined v3 scope boundary
  - Key scenarios: message/operation mapping, payload metadata import, request/reply rejection, silent drop of out-of-scope infrastructure fields.
  - Acceptance criteria: demo AsyncAPI spec imports successfully for publish/subscribe flows; request/reply specs fail with the documented error.
  - Verification: spec-driven integration tests plus schema tests for step and mapping files.
- **D2.3:** `schema-validate` and workflow compatibility checks fail cleanly
  - Key scenarios: mid-workflow validation, unresolved-diagnostic reporting, incompatible workflow/step source-domain declarations, file-relative path resolution.
  - Acceptance criteria: `builder.validate()` is used for checkpoint validation; compatibility and path-resolution failures are surfaced before execution.
  - Verification: integration tests with and without `schema-validate`; resolver unit tests; compatibility validation tests.
- **D2.4:** Architecture docs reflect new importer dependencies and mapping terminology
  - Key scenarios: architecture docs show importer dependencies, glossary entries explain mapping terminology, and planning terminology aligns with importer behaviour.
  - What doc to update and why: update `docs/architecture/overview.md` to note `@eventcatalog/sdk` and `@asyncapi/parser`; extend the glossary with `Workflow`, `Step Config`, `Mappings File`, and `Canonical Identity` as product-facing terms.
  - Acceptance criteria: architecture docs mention both importer dependencies; glossary additions cover importer-facing workflow terms and mapping terminology.
  - Verification: grep/doc assertions confirm the dependency names appear in architecture docs and the required glossary terms are present.

### M3: AI steps add bounded, additive enrichment

AI-assisted workflow steps operate through a user-supplied CLI without introducing a provider SDK surface.

#### Deliverables

- **D3.1:** Shared AI CLI invocation contract exists
  - Key scenarios: `command` + `args`, stdin or single `{prompt}` substitution, timeout enforcement, strict stdout schema validation.
  - Acceptance criteria: AI steps invoke the workflow-owned AI CLI adapter; the adapter shells out via `child_process.spawn` with `shell: false`; malformed stdout and timeout cases fail cleanly.
  - Verification: unit tests with mocked child processes behind the adapter and a stub CLI integration test.
- **D3.2:** `ai-extract` applies only bounded, gap-driven additions
  - Key scenarios: gap-category computation, bounded file selection, overflow failure, additive `upsert*` with `noOverwrite`.
  - Acceptance criteria: AI extraction creates only missing components/links within the configured scope and logs applied additions.
  - Verification: integration tests against deliberate demo-app gaps for each supported gap category.
- **D3.3:** `ai-enrich` fills only missing metadata fields
  - Key scenarios: unresolved `missing-field` diagnostics, configured enrichable fields, preservation of deterministic scalars.
  - Acceptance criteria: AI enrichment mutates only `undefined` / `null` fields on existing components and emits enrichment log events.
  - Verification: integration tests against demo components with missing metadata and no-overwrite assertions.
- **D3.4:** Operator-facing docs explain the AI boundary clearly
  - Key scenarios: docs show CLI-based invocation, docs exclude SDK/auth ownership from Riviere, and docs explain why AI idempotency is manual-only in this phase.
  - What doc to update and why: document the no-SDK, user-configured-CLI model; add glossary coverage for `AI CLI`, `Workflow Diagnostics`, and `Workflow Log`; document deferred AI idempotency expectations.
  - Acceptance criteria: docs state `command` + `args`, `child_process.spawn`, no embedded AI SDK/auth handling, and manual-only AI idempotency guidance.
  - Verification: grep/doc assertions confirm the required AI boundary phrases appear in operator docs and glossary updates.

### M4: CLI commands make workflows operable

Users can initialize, validate, and run workflows with clear diagnostics and migration guidance.

#### Deliverables

- **D4.1:** `riviere workflow run` and `riviere workflow validate` are production-usable
  - Key scenarios: fail-fast validation levels, active-plan handling, deterministic execution, preserved NDJSON log on failure.
  - Acceptance criteria: both commands surface documented errors and respect `--skip-ai` / `--dry-run` semantics.
  - Verification: CLI integration tests cover success, validation failure, and step failure paths.
- **D4.2:** `riviere workflow init` is greenfield-only and migration-safe
  - Key scenarios: existing-config detection and refusal, ready-to-copy AI migration prompt, and successful greenfield generation of a workflow that validates and runs.
  - Acceptance criteria: init creates files only in greenfield scenarios; the generated workflow passes `workflow validate` and `workflow run`; non-greenfield runs refuse with the documented prompt and create no files.
  - Verification: integration tests cover both the greenfield success path and the existing-config refusal path.
- **D4.3:** CLI output and migration docs are complete
  - Key scenarios: step summary output, migration guide from `extract`, prompt-review mode via `--dry-run`.
  - Acceptance criteria: summary block matches §3.9.3; `docs/workflow/migrating-from-extract.md` exists and documents the five-step upgrade path.
  - Verification: golden-output tests assert the summary format, and grep/assertions confirm the migration guide file exists and contains the documented five-step upgrade path.

### M5: End-to-end verification is CI-gated

The demo app proves the whole workflow surface works, remains deterministic on the non-AI path, and stays regression-safe over time.

#### Deliverables

- **D5.1:** Full demo workflow matches ground truth
  - Key scenarios: final graph equality, targeted semantic assertions for overwrite/additive behaviour, NDJSON log assertions.
  - Acceptance criteria: running the demo workflow at the pinned SHA matches the approved ground-truth fixture and semantic assertions.
  - Verification: cross-repo E2E test in CI.
- **D5.2:** Transition fixtures and deterministic idempotency are enforced
  - Key scenarios: after-step fixture comparison, non-mutating `schema-validate`, deterministic-only double-run equality under `--skip-ai`.
  - Acceptance criteria: transition fixtures pass after every step; deterministic-only runs are byte-equal under canonical serialization.
  - Verification: CI runs transition-fixture assertions and the two-run deterministic idempotency check.
- **D5.3:** Cross-repo coordination stays maintainable
  - Key scenarios: pinned demo-app SHA, fixture regeneration workflow, no demo fixtures copied into `living-architecture`.
  - Acceptance criteria: CI clones the pinned demo-app revision, and coordinated updates require only SHA bumps plus fixture regeneration in the demo repo.
  - Verification: CI assertions confirm clone-at-pinned-SHA behaviour, and repository grep/assertions confirm demo-app source and fixtures are not duplicated into `living-architecture`.

### Success-criteria ownership

This table makes milestone completion auditable by assigning every success criterion to at least one planned deliverable.

| Deliverable | Owns success criteria             |
| ----------- | --------------------------------- |
| D0.1        | #27                               |
| D0.2        | #27, #29                          |
| D0.3        | #27, #8, #18, #42                 |
| D0.4        | #27, #28                          |
| D1.1        | #1, #2, #12                       |
| D1.2        | #5, #40                           |
| D1.3        | #20, #24, #25, #26                |
| D1.4        | #46                               |
| D1.5        | #11, #19, #31, #32, #35, #43, #45 |
| D2.1        | #3, #15, #29, #36, #39            |
| D2.2        | #4, #15, #29, #37, #38, #39       |
| D2.3        | #16, #23, #31                     |
| D2.4        | #47                               |
| D3.1        | #14, #33                          |
| D3.2        | #6, #22, #44                      |
| D3.3        | #7, #21                           |
| D3.4        | #48                               |
| D4.1        | #10, #17, #34, #41                |
| D4.2        | #9, #30                           |
| D4.3        | #17, #30, #41                     |
| D5.1        | #8                                |
| D5.2        | #13a, #18, #42                    |
| D5.3        | #27, #28                          |

Deferred/non-gating note: #13b remains intentionally deferred and is documented in §4 and §5 rather than owned by a delivery milestone in this phase.

---

## 8. Parallelization

Parallel work is by delivery track, not by workflow-step execution. Runtime execution remains sequential; implementation work can proceed in parallel once dependencies below are satisfied.

```yaml
tracks:
  - id: A
    name: Builder and extraction-core refactor
    deliverables:
      - D1.2
      - D1.3
  - id: B
    name: Workflow runtime and CLI surface
    deliverables:
      - D1.1
      - D1.5
      - D4.1
      - D4.2
      - D4.3
  - id: C
    name: Deterministic importers and config schemas
    deliverables:
      - D2.1
      - D2.2
      - D2.3
  - id: D
    name: AI workflow steps
    deliverables:
      - D3.1
      - D3.2
      - D3.3
  - id: E
    name: Demo app groundwork
    deliverables:
      - D0.1
      - D0.2
      - D0.3
      - D0.4
  - id: G
    name: End-to-end verification and CI gating
    deliverables:
      - D5.1
      - D5.2
      - D5.3
  - id: F
    name: Architecture and terminology updates
    deliverables:
      - D1.4
      - D2.4
      - D3.4
```

Dependency notes:

- M0 gates any deliverable that depends on demo-app specs, fixtures, or the pinned-SHA CI path.
- D1.2 and D1.3 gate D2.1, D2.2, D3.2, and D3.3 because all later steps rely on builder upsert behaviour and shared-builder extraction parity.
- D1.5 gates D2.1, D2.2, D3.1, and D4.1 because importer, AI, and CLI work all rely on the shared schema strictness and file-resolution contract.
- D1.1 gates D4.1 because the CLI commands are thin shells over the workflow runtime.
- D3.1 gates D3.2 and D3.3 because both AI steps share the CLI invocation and response-validation contract.
- Track A hands typed upsert semantics and extraction parity to tracks C and D before importer and AI-step implementation can stabilize.
- Track B hands the runtime shell, validation flow, and logging surfaces to tracks C, D, E, and G before end-to-end verification can lock fixtures.
- Track C hands deterministic merged-state fixtures to track G; track D hands AI stub/response-schema fixtures to track G.
- Track E can start early with demo-app artifacts and pinned-SHA wiring, while track G starts only after tracks A-D stabilize the engine and step contracts.
- Track F starts incrementally after the owning product boundary is stable: D1.4 after D1.1-D1.3, D2.4 after D2.1-D2.3, and D3.4 after D3.1-D3.3.

---

## 9. Architecture

Phase 13 fits the existing architecture by inserting a dedicated workflow runtime between the CLI and the existing extraction/builder packages while preserving the direct `riviere extract` path.

**Before Phase 13:**

```text
riviere-cli
  -> riviere-extract-ts
  -> riviere-builder
```

**After Phase 13:**

```text
riviere-cli
  -> riviere-workflow
  -> riviere-extract-ts   (direct `riviere extract` path remains)

riviere-workflow
  -> riviere-builder
  -> riviere-extract-config
  -> riviere-extract-ts
  -> riviere-query
```

**Module boundary and responsibilities:**

- `riviere-cli` remains a thin shell exposing `workflow run`, `workflow init`, `workflow validate`, and the existing direct extraction command.
- `riviere-workflow` owns workflow execution, the step registry, step contracts, diagnostics/log orchestration, file-relative path resolution, and built-in step implementations.
- `riviere-builder` remains the graph-construction authority; Phase 13 extends it with typed upsert semantics rather than introducing a parallel graph-merge layer.
- `riviere-extract-config` owns workflow, importer, mapping, and AI response schemas so validation rules stay centralized.
- `riviere-extract-ts` remains the deterministic extractor and exposes a pure `extractInto(...)` core reused by both direct CLI extraction and workflow execution.
- `riviere-query` remains the read-only graph query surface exposed via `builder.query()`; Phase 13 reuses it and does not add draft-only helpers.

**Thin-boundary rule:** `riviere-workflow` owns orchestration only — sequencing, validation, diagnostics reconciliation, path resolution, and adapter invocation. It does **not** own extraction DSL semantics, graph merge semantics beyond invoking builder upserts, or reusable vendor-domain models.

**Builder/workflow ownership split:** `riviere-builder` owns graph construction, typed upsert semantics, and graph-only validation/finalization. `riviere-workflow` owns runtime diagnostics, execution-plan orchestration, and the workflow-facade `validate()` / `build()` composition that layers unresolved workflow diagnostics on top of the underlying builder result.

**Internal package shape (ADR-002-aligned):**

```text
src/
  features/
    workflow-runtime/
    code-extraction/
    eventcatalog-import/
    asyncapi-import/
    ai-extract/
    ai-enrich/
    schema-validate/
  platform/
    infra/
      external-clients/
        ai-cli-runner/
        eventcatalog-sdk-client/
        asyncapi-parser-client/
      cli/
      logging/
      config/
  index.ts
```

**Import-boundary rules:**

- Only `platform/infra/external-clients/ai-cli-runner` may import Node `child_process`.
- Only `platform/infra/external-clients/eventcatalog-sdk-client` may import `@eventcatalog/sdk`.
- Only `platform/infra/external-clients/asyncapi-parser-client` may import `@asyncapi/parser`.
- Step handlers, registry/runtime code, and CLI entrypoints depend on workflow-owned interfaces/adapters, not on vendor SDK/parser/process APIs directly.

**Architecture alignment with existing docs:**

- Aligns with `docs/architecture/overview.md` by keeping extraction, builder, schema, and query responsibilities separate and composable.
- Aligns with ADR-001 by preserving extraction metadata logic in the extraction pipeline rather than moving extraction semantics into workflow glue.
- Aligns with ADR-002 by requiring `riviere-workflow` to follow the feature/platform/shell package structure and dependency-cruiser enforcement from day one.

**New dependencies and boundaries:**

- New package: `riviere-workflow`.
- New npm dependencies in workflow-owned adapter code: `@eventcatalog/sdk` and `@asyncapi/parser`.
- AI CLIs are runtime prerequisites only. They are not npm dependencies, and no AI SDK/auth boundary is introduced into the codebase. Process spawning is isolated behind the workflow-owned AI CLI adapter.

**Documentation that must be updated during delivery:**

- `docs/architecture/overview.md` — add the workflow runtime to the package/dependency view.
- `docs/architecture/domain-terminology/contextive/definitions.glossary.yml` — add workflow, step, mapping, diagnostics, and AI CLI terminology.
- New ADR — capture the workflow runtime boundary, registry-based step execution, and the choice to shell out to user-configured AI CLIs instead of embedding an SDK.

**Architecture review focus:**

- Whether the `riviere-workflow` package boundary is thin enough and does not absorb builder or extraction responsibilities.
- Whether typed builder upserts are the right extension seam versus a separate merge layer.
- Whether importer-specific dependencies stay isolated inside workflow-owned adapters rather than leaking into step handlers or runtime code.
- Whether the AI CLI boundary is sufficiently explicit to avoid accidental credential, SDK, or retry/cost logic creeping into core packages.
- Whether the write-port adapter split for `extractInto(...)` cleanly preserves strict direct-CLI behaviour while enabling merge-capable workflow composition.

---

## 10. Dependencies

**Depends on:**

- Phase 12 (Connection Detection) — `code-extraction` step runs the Phase 10/11/12 pipeline. Requires Phase 12 M1 (Core Extraction) and M4 (Configurable Layer) to be complete. Assumes stable extraction config schema and `EnrichedComponent` interface.

**Blocks:**

- Phase 14 (Cross-Repo Linking) — Workflows enable multi-repo extraction

---

## 11. Research References

### Integration SDKs

| Tool                                                 | SDK/Package       | License    | Data Available                                 |
| ---------------------------------------------------- | ----------------- | ---------- | ---------------------------------------------- |
| [EventCatalog](https://github.com/event-catalog/sdk) | @eventcatalog/sdk | MIT        | Events, services, producers/consumers, domains |
| [AsyncAPI](https://www.asyncapi.com/)                | @asyncapi/parser  | Apache 2.0 | Channels, messages, operations, schemas        |

### AI Integration

- **No SDK dependency.** AI steps use a workflow-owned adapter over `child_process.spawn` to shell out to a user-configured CLI — see §3.4.1.
- Prompt strategies for bounded code analysis are owned by the step handler code; prompts are constructed deterministically from builder state and a step-type-specific template. Riviere does not ask the CLI to self-report confidence and does not record a confidence score on AI-added graph elements.
- Response JSON schemas (one per AI step type) published in `riviere-extract-config` and used to validate CLI stdout before the response is applied to the builder.

---

## 12. Terminology

| Term                       | Definition                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workflow**               | A YAML definition specifying a sequence of steps that produce a complete Riviere graph. The primary interface for using Riviere.                                                                                                                                                                                                                                      |
| **Workflow Builder**       | The workflow-owned facade over `RiviereBuilder` that steps receive in `StepContext.builder`. Preserves the builder surface while composing in workflow-only diagnostics and finalisation rules.                                                                                                                                                                       |
| **Step**                   | A single unit of work in a workflow. Receives the builder, performs extraction/import/analysis, adds to the graph. Implements `WorkflowStepHandler`.                                                                                                                                                                                                                  |
| **Step Type**              | A category of step with specific behavior: `code-extraction`, `eventcatalog-import`, `asyncapi-import`, `ai-extract`, `ai-enrich`, `schema-validate`.                                                                                                                                                                                                                 |
| **Step Config**            | Configuration specific to a step type, stored in a separate file referenced by the workflow. Not part of the workflow definition.                                                                                                                                                                                                                                     |
| **Workflow Step Services** | Fixed runtime services passed to every step through `StepContext.services`. Phase 13 ships none — the field exists for future extensibility. AI steps acquire their runtime via a shelled-out CLI declared in step config (§3.4.1).                                                                                                                                   |
| **Workflow Diagnostics**   | Workflow-owned runtime state for unresolved draft-only diagnostics plus the structured NDJSON log sink. Exposed to steps through `StepContext.diagnostics`.                                                                                                                                                                                                           |
| **AI CLI**                 | The user-configured command-line tool that Riviere's AI steps invoke through the workflow-owned AI CLI adapter over `child_process.spawn` (e.g. `command: claude`, `args: ['-p']`). Riviere never imports an AI SDK — the CLI binary handles auth, cost, tokens, rate limits, retries, and model selection. Configured per AI step via structured `command` + `args`. |
| **Workflow Log**           | The structured NDJSON diagnostic artefact written to `<workflow-output-dir>/workflow.log.ndjson`. Contains stable-envelope events for step progress, overwrites, skipped imports, AI actions, unresolved diagnostics, and failures.                                                                                                                                   |
| **Mappings File**          | Configuration defining how external data models (EventCatalog, AsyncAPI) map to Riviere concepts. Convention-based defaults with explicit overrides.                                                                                                                                                                                                                  |
| **Canonical Identity**     | The final Riviere component identity produced by a step's mapping/config logic before the builder sees the component. Upsert happens after this identity is established.                                                                                                                                                                                              |
| **Upsert**                 | Typed builder capability (one `upsert*` method per component type) to add-or-merge a component. If the component ID already exists, scalar fields are merged **last-wins** by default (or preserved under `{ noOverwrite: true }`) and array fields union. If not, it creates the component. Enables multi-source graph construction.                                 |
| **noOverwrite**            | Option on every `upsert*` method. When `true`, scalar writes apply only to fields whose existing value is `undefined`/`null`; already-set scalars are preserved. Arrays still union. AI steps always pass `noOverwrite: true` so they never disturb values set by earlier deterministic steps.                                                                        |
| **Workflow Init**          | Interactive CLI command (`riviere workflow init`) that creates a workflow definition and all step configs. The setup process for new workflows.                                                                                                                                                                                                                       |
