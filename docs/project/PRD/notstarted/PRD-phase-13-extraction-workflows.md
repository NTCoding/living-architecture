# PRD: Phase 13 — Extraction Workflows

**Status:** Reviewed (ruthless review pass complete; ready for implementation planning)

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

This is not a generic workflow engine. Workflows are purpose-built for Riviere extraction. Every step receives the `RiviereBuilder` and calls its API to construct the graph. The builder is the single source of truth for graph construction — ID generation, validation, deduplication all go through the builder.

**Trade-off:** We sacrifice generality for simplicity and correctness. A generic engine would require intermediate representations, merge logic, and format translation. Builder-centric workflows get all of that for free from the existing builder infrastructure.

### 2.2 Sources of Truth First

**If a source of truth exists, use it.** Don't analyze code when a spec already describes the architecture.

| Priority (on scalar merge) | Source                | Example                            | Where it runs in the workflow                 |
| -------------------------- | --------------------- | ---------------------------------- | --------------------------------------------- |
| 1 — highest                | Existing specs        | AsyncAPI, EventCatalog             | Last among deterministic steps                |
| 2                          | Code with conventions | Golden Path extraction (Phase 12)  | Before spec imports                           |
| 3                          | Code with patterns    | Configurable extraction (Phase 12) | Before spec imports                           |
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
- fixed runtime services passed in `StepContext`

No step can read another step's config or rely on hidden cross-step state.

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

**Execution model:** Steps run sequentially, top to bottom. All steps share the same `RiviereBuilder` instance (passed by reference). Builder state accumulates across steps. If a step throws, the workflow aborts and no output is written.

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

**Required `apiVersion` field.** Every workflow YAML must declare `apiVersion` as its first top-level key. Phase 13 accepts exactly `v1`. The runtime checks `apiVersion` **before** any other structural validation; an unknown or missing value fails with: `unsupported workflow apiVersion '<value>'; this CLI understands: v1`. This costs one line in every workflow file today and guarantees that a future breaking change to the workflow format gets a clear, actionable error instead of silent misbehaviour. The field is a constant string enum, no coercion. Same strictness rules as §2.6. Other Riviere YAML formats (mapping files, step configs) version independently — each file format owns its own `apiVersion` sequence.

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

interface WorkflowStepHandler<TConfig = Record<string, unknown>> {
  /** Strict-typed config validator. Runs at workflow-validate time and before execute. */
  validateConfig(raw: unknown): TConfig

  /** Names of runtime prerequisites this step requires. Enforced at workflow-validate time. */
  requiredServices(): readonly WorkflowServiceName[]

  /** Executes the step. */
  execute(context: StepContext<TConfig>): Promise<void>
}

interface WorkflowStepServices {
  /** No AI SDK in Phase 13. AI steps shell out to a user-configured CLI — see §3.4.1. */
  [key: string]: never
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

**`requiredServices()` contract:**

- Built-in step handlers declare their runtime prerequisites up front. `ai-extract` and `ai-enrich` return `['ai-cli']`. All other built-in steps return `[]`.
- `workflow validate` (§3.6) calls `requiredServices()` on each step and asserts the prerequisite is satisfiable without actually invoking anything.
- For `'ai-cli'`: the first token of the step config's `command` field (e.g. `claude` in `claude -p`) is resolved against `PATH` via Node's resolver. If it doesn't resolve, validation fails: `Step '<name>' (<type>) requires the '<token>' CLI, but it is not installed or not in PATH`. No env-var probing, no API-key checks — Riviere never touches credentials.
- Validation runs during the **runtime-prerequisite** pass (§3.6) and is part of the fail-fast chain before any step executes.

**`validateConfig`** — Each step validates and narrows its own config from the raw YAML. This runs before `execute`, during the validation phase. Type-safe config per step type — `code-extraction` gets `CodeExtractionConfig`, `eventcatalog-import` gets `EventCatalogImportConfig`, etc.

**`execute`** — Receives the typed config, builder, logger, and fixed runtime services. Performs step work. Returns void on success, throws on failure.

The runtime is decoupled from concrete step implementations. It resolves step handlers by type name from the registry, calls `validateConfig()` for each step, then executes them in order. The step contract is exported from `riviere-workflow` so future extension can depend on the same seam.

### 3.3 Builder Creation and Workflow Compatibility Rules

The builder requires `sources` and `domains` at construction (`RiviereBuilder.new()`). The workflow therefore creates the builder eagerly at startup from its top-level graph definition.

**How it works (aligned with `workflow run` in §3.6):**

1. Load workflow YAML; assert `apiVersion: v1`
2. Structural validation (schema)
3. Semantic validation: call `validateConfig()` on each step
4. Runtime-prerequisite validation: call `requiredServices()` on each step, resolve AI CLI binaries against `PATH`
5. Create `RiviereBuilder.new({ name, description, sources, domains }, output)` — builder constructed exactly once, eagerly, after all validation passes
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

1. **Extract a pure core** (`extractInto(builder, config, options)` or equivalent) that accepts a caller-supplied `RiviereBuilder`, performs draft extraction + metadata enrichment + connection detection, and issues `builder.addEvent(...)` / `builder.addUseCase(...)` / `builder.link(...)` for each discovered component and link. No filesystem writes. No presenter. No `process.exit`.
2. **Rewrite `riviere extract` CLI** as a thin shell that: constructs a builder from the extraction config's own `sources` / `domains`, calls the pure core with it, then writes `builder.build()` to stdout or the configured output path. Preserves current CLI behaviour exactly — same inputs → same output JSON.
3. **`code-extraction` step handler** calls the same pure core with the shared workflow builder. Zero behavioural divergence between direct CLI and workflow usage (the promise in the paragraph above is enforced by the two paths using the same core function).
4. **Lenient-mode markers**: the core propagates `_missing` (on enriched components) and `_uncertain` (on links) through `add*` / `link` calls using the schema fields introduced in §3.5.2. These markers are no longer stripped at the extract-ts → builder boundary.
5. **ts-morph resource management**: the core is responsible for disposing any per-call ts-morph `Project` instances before returning, so multiple `code-extraction` steps in one workflow run do not accumulate compiler state.

This refactor lands in `riviere-extract-ts` and `riviere-cli` as a prerequisite of the `code-extraction` step — it is **not** a downstream detail of Phase 13 but a named deliverable. See success criterion #24.

**Non-goal:** changing extraction behaviour itself. The refactor is purely a structural separation of concerns — current tests for `riviere extract` must continue to pass unchanged against the rewritten CLI shell.

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

EventCatalog producer/consumer relationships must resolve to canonical Riviere component identities before links are created. If a mapping is missing and convention-based defaults can't resolve that identity (for example, a service has no domain), strict mode (`allow-unmapped: false`) fails with a clear error. Lenient mode (`allow-unmapped: true`) skips the unmapped item and records it in the step's unmapped-items summary (see §3.4.2).

**Schema — `eventcatalog-import.yaml` and `eventcatalog-mappings.yaml` both validated by JSON Schema.** Both schemas live in `riviere-extract-config` alongside the workflow and extraction-config schemas. All §2.6 rules apply: every string field has `minLength: 1`, `type` is an enum of `ComponentType` values (reused from `riviere-schema`), `allow-unmapped` is a required boolean, `domains` / `services` / `events` sections are optional objects keyed by EventCatalog names, and unknown top-level keys are rejected (`additionalProperties: false`). The step handler's `validateConfig()` parses the YAML and validates against the schema at `workflow validate` time — typos and shape errors fail before `workflow run` ever starts.

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

**AsyncAPI v3 field-level scope (exhaustive):**

| AsyncAPI v3 concept                                  | Phase 13 treatment                                                                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `info.title`, `info.description`                     | Consumed; become part of spec-derived metadata on the synthesised publisher/subscriber components.                                                                             |
| `servers`                                            | **Dropped.** Broker infrastructure, not component flow. Step does not fail on its presence.                                                                                    |
| `channels`                                           | Read to resolve message payloads and parameters; not synthesised as components (channels are infrastructure, not flow nodes).                                                   |
| `channels.*.parameters`                              | **Dropped** in Phase 13. Dynamic topic parameters are deferred.                                                                                                                |
| `channels.*.bindings`                                | **Dropped** in Phase 13. Broker-specific bindings are noise for flow extraction.                                                                                                |
| `operations` with `action: send`                     | Consumed — resolved to a canonical publisher component via mappings; async link added from publisher → event.                                                                   |
| `operations` with `action: receive`                  | Consumed — resolved to a canonical EventHandler via mappings; async link added from event → handler.                                                                            |
| `operations.*.reply`                                 | **Fails validation** with `asyncapi request/reply pattern not supported in Phase 13 (operation: '<id>')`. Strict behaviour regardless of `allow-unmapped`.                       |
| `operations.*.traits`                                | **Dropped.** Operation-level trait composition is applied by the parser before this step sees the spec; no extra handling.                                                     |
| `messages`                                           | Consumed — resolved to canonical Event components via mappings.                                                                                                                 |
| `messages.*.payload`                                 | Consumed as metadata on the Event component (schema reference preserved; full payload schema is not inlined into the graph).                                                    |
| `messages.*.headers`, `messages.*.bindings`          | **Dropped** in Phase 13.                                                                                                                                                        |
| `components.*` (reusable schemas, messages, etc.)    | Resolved by `@asyncapi/parser` before this step sees the spec; no special handling required.                                                                                    |
| `security`, `tags`, `externalDocs`                   | **Dropped** in Phase 13.                                                                                                                                                        |

Any other AsyncAPI v3 field not listed above is dropped silently; the step never fails for an unrecognised top-level key (AsyncAPI evolves, and we don't want new v3 micro-revisions to break imports). The list above is exhaustive for the Phase 13 scope decision — future phases may promote dropped items to consumed, and the list is updated accordingly.

**Schema — `asyncapi-import.yaml` and `asyncapi-mappings.yaml` both validated by JSON Schema.** Both schemas live in `riviere-extract-config`. Same §2.6 rules as EventCatalog: `minLength: 1` on every string field, `type` from the `ComponentType` enum, `allow-unmapped` required boolean, `messages` / `operations` optional objects keyed by AsyncAPI names, `additionalProperties: false`. The step handler's `validateConfig()` validates at `workflow validate` time.

#### `ai-extract`

Discovers components and connections that deterministic extraction missed. Analyzes source code directories, inspects the builder to see what's already been extracted, and identifies gaps.

```yaml
# ai-extract.yaml
apiVersion: v1
command: claude -p          # CLI the step shells out to (§3.4.1). Prompt piped via stdin.
timeout-seconds: 600

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

Components and links added by `ai-extract` carry provenance metadata indicating they are AI-discovered (`source: 'ai-extract'`). No confidence score is recorded — Riviere does not ask the CLI to self-report confidence, and does not apply any threshold-based filtering. Every item returned by the CLI that passes response-schema validation is applied to the builder; the user reviews the output graph to detect over-reach and adjusts the prompt / source selection accordingly.

`ai-extract` is gap-driven, not whole-repo discovery. It operates on bounded sources, bounded gap categories, bounded component types, and bounded context windows.

**Bound-limit overflow behaviour:** If the files matched by `sources` + `context.exclude` exceed `max-files-per-batch * max-batches`, the step does **not** silently truncate. It fails with a clear error: `ai-extract: source scope produced N files, exceeds bound (max-files-per-batch * max-batches = M). Narrow 'sources' or raise the bounds explicitly.` This forces the user to consciously size the AI scope rather than discover truncation by missing components in the output graph.

**Gap category computation (precise definitions):**

Each value in `selection.from` maps to a concrete gap set computed from builder state (via §3.5.1 read surface) plus the configured source directories:

| Gap category              | How the step computes the gap set                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `uncertain-links`         | `builder.query().uncertainLinks()` — every link with `_uncertain` set is a candidate for AI re-resolution.                                                                                                         |
| `missing-events`          | AI scans configured sources for event-publishing call sites, maps each to a `(domain, module, name)` candidate, filters out those whose canonical ID already exists in `builder.query().componentsByType('Event')`. |
| `missing-event-handlers`  | For each `Event` component in `builder.query().publishedEvents()` that has no inbound link from a component of type `EventHandler`, AI scans sources for plausible handler call sites targeting that event name.    |
| `missing-use-cases`       | AI scans sources for use-case-shaped call sites (framework-specific patterns allowed via the step config's future extensibility) and filters out those already present in `builder.query().componentsByType('UseCase')`. |

Any future gap category is added as a new enum value with its computation rule documented here. The step never does free-form "find anything interesting" — each category is a discrete, reviewable computation.

**Additive-only contract (see §3.5):** `ai-extract` always calls `upsert*` with `{ noOverwrite: true }`. Under this flag, a collision with an existing component returns `{ created: false }` with scalars untouched; the step logs the collision as "candidate already present" and moves on. New links are added via the standard dedup-on-tuple rule. There is no separate AI-only facade — the `noOverwrite` flag on the seven typed upsert methods is sufficient.

**Enums over strings:** `selection.from` is an enum of supported gap categories. `selection.component-types` is an enum of supported Riviere component types.

**AI runtime boundary:** The step shells out to the CLI command declared in its config (`command:` field) — see §3.4.1. Riviere does not manage API keys, tokens, cost, rate limits, or retries. If the CLI binary is not in `PATH`, `workflow validate` already caught it via `requiredServices()` (§3.2). Response JSON is validated against a strict schema published in `riviere-extract-config`.

#### `ai-enrich`

Fills missing metadata fields on components already in the builder. Targets `_missing` fields from lenient mode extraction and any components lacking optional metadata.

```yaml
# ai-enrich.yaml
apiVersion: v1
command: claude -p          # CLI the step shells out to (§3.4.1). Prompt piped via stdin.
timeout-seconds: 600

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

Reads source code context for each component with missing metadata and proposes values. Enrichments carry the same `source: 'ai-enrich'` provenance as `ai-extract` output; no confidence score is recorded.

`ai-enrich` can only touch existing builder components. MVP supports `missing-fields-only: true` only.

**Additive-only contract (see §3.5):** `ai-enrich` calls the typed `upsert*` method matching the target component's type with `{ noOverwrite: true }`, supplying only the fields it wants to fill. Under `noOverwrite`, any scalar already set by an earlier step is preserved; only `undefined` / `null` fields receive the AI-proposed value. This guarantees that `ai-enrich`'s position at the end of the workflow never disturbs values set by earlier deterministic steps, regardless of last-wins ordering elsewhere.

**Enums over strings:** `selection.component-types` is an enum of supported component types. `fields` is an enum of allowed enrichable fields.

**AI runtime boundary:** Same runtime model as `ai-extract` — shells out to the CLI command in its config (`command:` field). See §3.4.1.

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

Phase 13 ships the **absolute minimum possible AI surface**. Riviere does **not** depend on any AI SDK. It does not manage API keys, tokens, cost, rate limits, retries, or prompt caching. Instead, AI steps **shell out to a CLI command the user configures** — typically `claude -p`, `codex`, `ollama run`, or any equivalent — and parse structured JSON from stdout.

**How it works (the whole mechanism):**

1. The AI step builds a prompt string from builder state (gap set, component IDs, relevant source file snippets) and a step-type-specific prompt template.
2. The step invokes the configured CLI command with the prompt supplied via stdin (preferred) or as an argument.
3. The step captures stdout.
4. The step validates stdout against a strict JSON Schema for that step type (response schema lives in `riviere-extract-config`).
5. The step applies the response to the shared builder using the existing typed `upsert*` methods with `{ noOverwrite: true }` and standard link dedup.

**Configuration (in the step config, not global):**

```yaml
# ai-extract.yaml
command: claude -p                # CLI command; prompt is piped via stdin
# OR
command: "claude --prompt"        # If the CLI takes the prompt as an argument, Riviere substitutes {prompt}
timeout-seconds: 600              # Hard cap enforced by Riviere (SIGKILL on timeout)
sources:
  - ./orders/src
  - ./shipping/src
selection:
  ...
```

- `command` is a required string specifying the shell command to invoke. Riviere executes it via `child_process.spawn` with `shell: false` to avoid shell-injection surface (the prompt is passed via stdin by default; if the command template contains `{prompt}`, that placeholder is substituted with the prompt string and passed as a discrete argv element — no shell expansion).
- `timeout-seconds` is a required integer (`minimum: 1`). Exceeding the timeout kills the child process and fails the step.
- **No env vars, no API keys, no provider config in YAML.** Authentication is whatever the CLI binary itself requires — `claude` has its own auth, `codex` has its own, `ollama` has none. Riviere never sees or touches credentials.

**What `workflow validate` checks (via `requiredServices()` → `'ai-cli'`):**

- The first token of `command` resolves in `PATH` (`which <token>` succeeds). If it doesn't: `workflow validate` fails with `Step '<name>' (<type>) requires the '<token>' CLI, but it is not installed or not in PATH`.
- The command template parses correctly (at most one `{prompt}` placeholder).

**What Riviere does NOT build:**

- API-key loading, keychain integration, dotenv parsing.
- Token counting, cost estimation, budget caps.
- Rate limiting, exponential backoff, retries, circuit breakers.
- Prompt caching, response caching, replay.
- Model selection, reasoning mode, temperature controls — whatever the user wants is baked into the `command` string (e.g. `claude --model claude-opus-4-6 -p`).

All of the above is the CLI binary's problem. If the CLI already provides it, great. If not, it's still not Riviere's problem.

**`--dry-run` flag on `workflow run`:** for every AI step that would execute, prints the prompt that would be sent to stdout and skips the CLI invocation. No graph mutation from AI steps under `--dry-run`. Useful for review and CI gating.

**`--skip-ai` flag on `workflow run`:** skips AI steps entirely (no prompt construction, no child process). Deterministic-only output. This is how CI runs the deterministic-path idempotency test (criterion #13a) without touching any AI CLI.

**Response schema (strict, per AI step type):** each AI step type has a JSON Schema in `riviere-extract-config` defining what the CLI's stdout must contain. Malformed JSON, schema violations, or fields the step didn't ask about fail the step with a clear error. Same §2.6 strictness rules — empty strings banned, enums mandatory, `additionalProperties: false`. The response schema is published and documented so prompt authors (and users of third-party CLI agents) can target it exactly.

**Why this design:**

- Zero coupling to any specific AI provider.
- Zero auth/secret surface in Riviere.
- Works on day one with any CLI the user already has.
- When a better CLI appears next year, switch by editing one line of step config — no Riviere release needed.

#### 3.4.2 Unmapped-Items Summary (lenient import steps)

When `eventcatalog-import` or `asyncapi-import` runs with `allow-unmapped: true`, skipped items are recorded in a structured summary rather than lost in a stream of warning lines.

**Behaviour:**

- Each skip is recorded with: source-system record identifier (e.g. EventCatalog service name, AsyncAPI operation id), reason (`no-domain`, `no-canonical-mapping`, `unresolved-producer`, `unresolved-consumer`, `unsupported-pattern`, etc. — enum owned by the step type), and source location where known.
- At step completion, the step logs a one-line summary: `import-eventcatalog: imported 180, skipped 20 (see ./.riviere/unmapped/import-eventcatalog.json)`.
- The full structured summary is written to `<workflow-output-dir>/unmapped/<step-name>.json` — one file per import step that skipped anything. File schema lives in `riviere-extract-config` and follows the §2.6 strictness rules.
- Strict mode (`allow-unmapped: false`) does not produce this file; a skip is a step failure, not a summary entry.

**File path resolution:** `<workflow-output-dir>` = the parent directory of the workflow's `output` path. `./.riviere/architecture.json` → `./.riviere/unmapped/`.

**Schema (per-file):**

```json
{
  "apiVersion": "v1",
  "step": "import-eventcatalog",
  "stepType": "eventcatalog-import",
  "runAt": "2026-04-14T12:34:56Z",
  "skipped": [
    {
      "recordId": "OrdersService",
      "recordType": "service",
      "reason": "no-domain",
      "sourceLocation": "eventcatalog/services/orders-service/index.mdx"
    }
  ]
}
```

**Why this is not "just logs":** Users in real repos won't scroll through warning lines. A structured file gives them a review artefact they can diff run-to-run, commit to source control as a baseline, or feed into tooling. The one-line step summary is the attention signal; the file is the detail.

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

**Link deduplication:** `link()` deduplicates by `(source, target, type)` tuple. Second call with the same tuple is a no-op by default, or merges link-level scalars under `noOverwrite` semantics when passed. `linkExternal()` deduplicates by `(source, target.repository, target.name, type)`.

**`addDomain()` and `addSource()` become idempotent:** Adding a domain/source that already exists is a no-op. No error. Source identity = `repository`. Domain identity = domain name.

#### 3.5.1 Builder Read Surface (already exists; documented here for step authors)

Phase 13 does **not** introduce a new read API — the builder already exposes one. Step handlers and transition-fixture capture use the existing surface:

| Method                              | Purpose                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| `builder.validate(): ValidationResult` | **Non-throwing** validation. `schema-validate` step uses this.     |
| `builder.warnings()`                | Non-fatal issues on the current graph.                               |
| `builder.stats()`                   | Counts of components, links, domains.                                |
| `builder.orphans()`                 | Component IDs with no incoming or outgoing links.                    |
| `builder.query(): RiviereQuery`     | Full read-only query object (see `@living-architecture/riviere-query`). |
| `builder.build(): RiviereGraph`     | Validate-or-throw. Used for final output. Unchanged by Phase 13.     |

`RiviereQuery` already exposes `components()`, `links()`, `find(predicate)`, `findAll(predicate)`, `componentById(id)`, `componentsInDomain(name)`, `componentsByType(type)`, `publishedEvents()`, `eventHandlers()`, `externalLinks()`, and more. Phase 13 adds two narrow typed helpers for AI steps:

```typescript
// in RiviereQuery
componentsWithMissingFields(fields?: ComponentFieldName[]): Component[]
uncertainLinks(): Link[]
```

- `componentsWithMissingFields(fields)` — returns components where `_missing` intersects `fields` (or is non-empty if `fields` omitted).
- `uncertainLinks()` — returns links where `_uncertain` is set.

These are the **only** new query methods. All other gap computation (e.g. "which published events have no handler?") composes existing `RiviereQuery` methods inside step handlers.

#### 3.5.2 Schema Propagation of Uncertainty Markers

Today `_missing` lives on `EnrichedComponent` (extract-ts) and `_uncertain` on `ExtractedLink` (extract-ts), but these fields are **stripped** when extraction output becomes builder state. Phase 13 propagates them through:

- **`riviere-schema`** gains two optional fields:
  - `Component._missing?: string[]` — names of fields the extractor expected but could not resolve. When present, `minItems: 1`. Absent when the component has no missing fields.
  - `Link._uncertain?: string` — human-readable reason the link is uncertain. When present, `minLength: 1`. Absent when the link is deterministic.
  - Same strictness rule as §2.6: no empty strings, no empty arrays.
- **`riviere-extract-ts`** stops stripping these fields when calling `add*` / `upsert*`; the builder accepts and stores them.
- **`toRiviereGraph()`** preserves them in final output.
- **`RiviereQuery`** reads them via the two new helpers above.

Consumers (eclair, AI steps, users) can now see extraction uncertainty in the output graph. This is a product improvement beyond AI-step plumbing — visualizers can render uncertain links distinctly, and graph diffs can surface "how much uncertainty is in this build."

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

**Greenfield-only policy — refuse to run if existing extraction configs are detected.** Before writing any files, `init` walks the target directory for `riviere-config.yaml` files (the existing extract-command format). If any are found:

- Print the list of detected configs with absolute paths.
- Print the error: `existing extraction configs detected; manual step required: reference each in the generated workflow under 'steps[].config'. See docs/workflow/migrating-from-extract.md.`
- Exit with non-zero code **without creating any files**.

Rationale: Phase 13 does not ship a migration tool. Automatic detect-and-wire risks producing a workflow that subtly differs from the user's current extract invocation (paths, working directory, inherited CLI flags). A migration command may land in a later phase; until then, users with existing configs follow the documented manual procedure. A short migration guide (`docs/workflow/migrating-from-extract.md`) is part of Phase 13 documentation scope — see success criterion #30.

`riviere workflow init` is distinct from `riviere extract`. `extract` is for single-codebase extraction (Phase 10-12 direct usage). `workflow run` is for multi-source orchestration (Phase 13). They are separate commands — `extract` does not accept a `--workflow` flag.

**Upgrade path for existing `extract` users (documented, not automated):**

1. Keep the existing `riviere-config.yaml` unchanged.
2. Create `riviere-workflow.yaml` manually with workflow-level `name`, `description`, `output`, `sources`, `domains`.
3. Add a single `code-extraction` step with `config: ./<path-to-existing-riviere-config.yaml>`.
4. Run `riviere workflow validate` to confirm the compatibility rules in §3.3 pass (workflow `sources` / `domains` must be compatible with the extraction config's declarations).
5. Run `riviere workflow run` to produce the equivalent output graph.

The workflow run and the prior `riviere extract` invocation must produce the same component IDs and link tuples against the same config (the parity guarantee from §3.4 "Required extraction refactor" + success criterion #25).

#### `riviere workflow run`

Executes the workflow:

1. Load and parse YAML; assert `apiVersion: v1`
2. Validate workflow structure against JSON Schema
3. Resolve step handlers by type name
4. Call `validateConfig()` on each step (fail-fast before execution)
5. Run `requiredServices()` checks (e.g. AI CLI resolution)
6. Execute steps sequentially, passing shared builder
7. On success: write `builder.build()` output to `output` path
8. On failure: report which step failed, why, and exit code 1

**Flags:**

- `--dry-run` — executes deterministic steps normally; for every AI step that would invoke its configured CLI, prints the prompt that would be sent (to stdout) and skips the CLI invocation and any graph mutation that would have come from the AI response. Useful for prompt review and CI cost-gating. Other step types are unaffected.
- `--skip-ai` — skips AI steps entirely (no prompt construction, no CLI invocation). Deterministic-only output. This is how the deterministic-idempotency test (§3.8.3, criterion #13a) runs in CI without any AI CLI present.

**Error handling:** If a step fails, the workflow aborts. No retry, no skip, no partial output. Builder state is discarded.

**Distinction between error types:**

- **Config errors** (missing file, invalid YAML, schema violation): always fail, regardless of lenient mode
- **Extraction strictness** (`allow-incomplete`): controls whether unresolvable types produce errors or uncertain markers within a `code-extraction` step. Does not affect workflow-level error handling.
- **AI CLI failures** (non-zero exit from the shelled-out CLI, timeout hit, stdout is not valid JSON matching the response schema): fail the owning AI step; workflow aborts per the standard rule.

**Step summary output:** Each step logs completion with duration. Final line: `Workflow completed in Xs (step1: Xs, step2: Xs, ...)`.

#### `riviere workflow validate`

Three validation levels, all running in fail-fast order:

1. **Structural:** YAML parses, required fields present, all referenced config/mapping files exist on disk.
2. **Semantic:** Each step handler's `validateConfig()` runs against its config (extraction configs validate against schema, mappings files parse correctly, AI configs validate enums/limits, step-declared domains and sources are compatible with the workflow).
3. **Runtime-prerequisite availability:** Each step handler's `requiredServices()` is called. For `'ai-cli'` the runtime resolves the first token of the step config's `command` field against `PATH`; if it doesn't resolve, validation fails with a clear per-step message (`Step '<name>' (<type>) requires the '<token>' CLI, but it is not installed or not in PATH`). No env-var probing, no API-key checks — Riviere never touches credentials. See §3.2 and §3.4.1 for the contract.

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
```

**Responsibilities:**

- `riviere-cli` — CLI entrypoints (`workflow run`, `workflow init`, `workflow validate`)
- `riviere-workflow` — workflow executor, step registry, exported step contract, built-in steps, shell-out invocation of user-configured AI CLIs (§3.4.1). No AI SDK dependency.
- `riviere-builder` — graph construction, idempotent `addSource()` / `addDomain()`, and the seven typed `upsert*` methods with `{ noOverwrite }`
- `riviere-extract-config` — workflow and step config schemas/types, mapping file schemas, AI response schemas
- `riviere-extract-ts` — deterministic extraction; exposes the pure `extractInto(builder, config, options)` core reused by `code-extraction`

**Extension direction:** Phase 13 exports the step contract now but does not implement user plugin loading. Built-in steps are resolved through the same registry that future external steps will use.

**Repository hygiene requirements for the new `riviere-workflow` package:**

- **Folder structure** follows the monorepo convention (`src/features/*`, `src/platform/*`, `src/shell/*`, `src/index.ts`) per ADR-002 and the `separation-of-concerns` skill.
- **Dependency-cruiser rules** copied and adapted from existing packages so no cross-feature imports, no domain-to-upward dependencies, and `entrypoint` restrictions are enforced from day one. Added to the repo's root `dependency-cruiser.mjs`.
- **Role enforcement:** `riviere-workflow` is enforced per `.riviere/role-enforcement.config.ts`. Every exported declaration in the package receives a `/** @riviere-role <role-name> */` tag. Roles for the new package (e.g. `workflow-runtime`, `step-handler`, `step-registry`) are added to `.riviere/roles.ts` in the same PR that introduces the package.
- **Coverage:** 100% test coverage mandatory per the root `CLAUDE.md` testing convention.
- **Cross-package imports:** uses `@living-architecture/riviere-builder`, `@living-architecture/riviere-extract-config`, `@living-architecture/riviere-extract-ts`, `@living-architecture/riviere-schema`, `@living-architecture/riviere-query` via workspace references; never relative paths across package boundaries.

### 3.7.1 Milestones

Phase 13 is ordered into six milestones. Demo-app groundwork (M0) must land before any milestone can claim a success criterion that references demo-app fixtures.

| Milestone | Name                         | Scope                                                                                                                                                        | Claims success criteria |
| --------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| M0        | Demo App Groundwork          | Lands in `ecommerce-demo-app` repo: two domain codebases, deliberate extraction gaps, EventCatalog, AsyncAPI spec, mapping files, workflow YAML, step configs, ground truth, 7 transition fixtures, README. Inter-repo contract wired (pinned SHA from `living-architecture` CI). | Precondition for §3.8 criteria; no direct criterion claim |
| M1        | Workflow Engine + Builder    | `riviere-workflow` package scaffold, registry runtime, step contract, shared builder, workflow JSON Schema in `riviere-extract-config`, `upsert*` methods + `noOverwrite`, schema propagation of `_missing` / `_uncertain`, new typed query helpers, extraction refactor (§3.4). | #1, #2, #5, #11, #12, #20, #21, #24, #25, #26 |
| M2        | Built-in Deterministic Steps | `code-extraction`, `eventcatalog-import`, `asyncapi-import`, `schema-validate` step handlers; mapping-file schemas; compatibility-rule validation.           | #3, #4, #15, #16, #23   |
| M3        | AI Steps                     | `ai-extract`, `ai-enrich` step handlers; shell-out to user-configured AI CLI per §3.4.1; response JSON schemas in `riviere-extract-config`; gap-category computation; `--dry-run` and `--skip-ai` flags on `workflow run`. **Scope note:** the shell-out design keeps AI surface small enough to belong in this phase — no SDK dependency, no credential surface, no retry/rate-limit logic to design. If AI behaviour were larger, it would split into its own phase. | #6, #7, #14, #22, #33 |
| M4        | CLI Commands                 | `riviere workflow run` (with `--dry-run` and `--skip-ai`), `riviere workflow init`, `riviere workflow validate`; step summary output; error handling. **`init` UX scope:** greenfield-only (refuses if `riviere-config.yaml` exists, per §3.6); minimal interactive prompts (codebases → spec sources → AI yes/no → validation step). No interactive cwd-detection of specs, no auto-wiring of existing configs. Larger init UX (auto-detect, migration assistant) is a future phase. | #9, #10, #17, #30, #34 |
| M5        | End-to-End Demo Verification | Phase 13 CI pulls `ecommerce-demo-app` at pinned SHA, runs full workflow, verifies ground truth and transition fixtures. Idempotency verification runs the deterministic-only variant of the demo workflow (AI steps skipped) per #13a; AI-inclusive idempotency (#13b) is deferred. | #8, #13a, #18, #19 |

**M0 acceptance criteria (demo-app repo PR must satisfy before M0 closes):**

- D0.1 Two domain codebases exist with source code exercising every built-in component type (UI, API, UseCase, DomainOp, Event, EventHandler, Custom).
- D0.2 A named list of deliberate extraction gaps is documented in the repo's README, each with an expected AI-discovery outcome.
- D0.3 EventCatalog instance is valid and covers the cross-domain event flows. Includes the **EventCatalog SDK coverage spike** (§6 open question 1): demo-app M0 PR includes either (a) a passing test that loads the demo EventCatalog via `@eventcatalog/sdk` and yields all relationships `eventcatalog-import` consumes, or (b) a fallback frontmatter+MDX parser plus a passing test against the same instance. M2 cannot start until this spike resolves.
- D0.4 AsyncAPI v3 spec validates via `@asyncapi/parser` and covers pub/sub only (no request/reply, per §6 open question 2).
- D0.5 Mapping files (EventCatalog + AsyncAPI) normalise to canonical Riviere identity with zero ambiguity against both domain codebases.
- D0.6 `riviere-workflow.yaml` is the reference workflow ordering from §3.1 and §3.8.1; `riviere workflow validate` passes against it.
- D0.7 Ground-truth graph is the expected `RiviereGraph` JSON after the workflow runs cleanly; all components and link tuples enumerated.
- D0.8 Seven per-step transition fixtures exist and were generated by serialising the read surface (§3.5.1) against a known-good run.
- D0.9 `ecommerce-demo-app` README positions the repo as a realistic first-customer setup, not a test harness.
- D0.10 Inter-repo contract wired: `living-architecture` CI pins the demo-app commit SHA; a dependency-update PR template exists for coordinated schema/behaviour changes.

### 3.8 Demo App Validation

Every capability is validated against `ecommerce-demo-app`, **which is a separate repository** — not an app inside this monorepo. Phase 13's validation pulls the demo-app repo at a pinned commit; engine code in `living-architecture` never contains demo-app source or fixtures. The inter-repo contract is part of this PRD's scope and must be explicit before M2 (built-in steps) can claim any `§3.8` success criterion.

**Repository split (inter-repo contract):**

| Repository            | Owns                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `living-architecture` | The workflow engine, built-in steps, CLI, schemas, and this PRD. No demo-app source or fixtures.                                                                         |
| `ecommerce-demo-app`  | The demo codebase (multiple domains in source), EventCatalog instance, AsyncAPI v3 spec, mapping files, workflow YAML, step configs, ground-truth graph, and transition fixtures. |

**Demo-app repository structure (owned by the `ecommerce-demo-app` repo, reproduced here for contract clarity):**

```text
ecommerce-demo-app/                          (separate repo)
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
        ├── 01-after-orders-code.json
        ├── 02-after-shipping-code.json
        ├── 03-after-eventcatalog.json
        ├── 04-after-asyncapi.json
        ├── 05-after-ai-extract.json
        ├── 06-after-ai-enrich.json
        └── 07-after-validate.json
```

**Demo-app deliverables (owned by `ecommerce-demo-app` repo, gated by M0):**

1. **Two domain codebases** — `orders-domain/` and `shipping-domain/` with realistic but small TypeScript source exercising the full component taxonomy (UI, API, UseCase, DomainOp, Event, EventHandler, Custom).
2. **Deliberate extraction gaps** — a named, enumerated list of code patterns that deterministic extraction cannot resolve (e.g. dynamic event names via config lookup, runtime dependency injection, indirection through a factory). Each gap has an expected AI-discovery outcome.
3. **EventCatalog instance** — domains, services, events, producer/consumer relationships.
4. **AsyncAPI v3 spec** — channels, messages, operations covering the cross-domain flows.
5. **Mapping files** — EventCatalog and AsyncAPI mappings that normalise to canonical Riviere identity.
6. **Workflow YAML + step configs** — the full `riviere-workflow.yaml` exercising every built-in step type, plus the referenced step-config files.
7. **Ground-truth graph** — the expected `RiviereGraph` JSON after running the full workflow, used for end-to-end verification.
8. **Per-step transition fixtures** — seven JSON snapshots (§3.8.2), each captured via the read surface defined in §3.5.1. These define the expected builder state after each step.
9. **README** — positions the repo as "a believable first customer setup" (§3.8.1), not as a Riviere test fixture.

**Integration contract:**

- The `ecommerce-demo-app` repository is pinned to a specific commit SHA from `living-architecture`'s CI. When Phase 13 changes require a corresponding demo-app update, both repos land as a coordinated pair with matching PRs; the pinned SHA in `living-architecture` bumps after the demo-app PR merges.
- Phase 13 integration tests clone the demo-app repo at the pinned SHA into a CI-local directory and run `riviere workflow run` against the cloned `riviere-workflow.yaml`.
- Fixture comparison (ground truth + transition fixtures) is driven by the demo-app repo's JSON files, not by copies stored in `living-architecture`.
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

steps:
  - name: extract-orders
    type: code-extraction
    config: ./orders-domain/riviere-config.yaml

  - name: extract-shipping
    type: code-extraction
    config: ./shipping-domain/riviere-config.yaml

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
apiVersion: v1
command: claude -p
timeout-seconds: 600

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
```

```yaml
# steps/ai-enrich.yaml
apiVersion: v1
command: claude -p
timeout-seconds: 600

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

##### Step 1 — `extract-orders`

Loads:

- `./orders-domain/riviere-config.yaml`
- TypeScript files matched by that config

Reads:

- deterministic component extraction rules
- deterministic metadata extraction rules
- deterministic connection rules and configurable connection patterns

Modifies builder by:

- adding orders-domain code components (APIs, UseCases, DomainOps, Events, EventHandlers) with code-derived scalar values
- adding deterministic sync and async links discovered from the orders codebase

Representative transition:

```text
before:
  components: []
  links: []

after:
  components include:
    - orders/PlaceOrder (UseCase)   -- with code-derived description
    - orders/OrderPlaced (Event)    -- with code-derived eventName, description
    - orders code APIs / DomainOps / internal UseCases

  links include:
    - sync links from orders APIs to orders use cases
    - async link PlaceOrder -> OrderPlaced (if discovered deterministically)
```

##### Step 2 — `extract-shipping`

Loads:

- `./shipping-domain/riviere-config.yaml`
- TypeScript files matched by that config

Modifies builder by:

- adding shipping-domain code components with code-derived scalar values
- adding deterministic shipping-domain sync and async links

Representative transition:

```text
before:
  orders code components already in the graph

after:
  builder gains shipping code-owned components and sync links
  graph now contains all code-discoverable components across both domains
```

##### Step 3 — `import-eventcatalog`

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

##### Step 4 — `import-asyncapi`

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

##### Step 5 — `discover-gaps`

Loads:

- `./steps/ai-extract.yaml`
- bounded source batches from `orders-domain/src` and `shipping-domain/src`
- current builder snapshot

Reads:

- only files allowed by the AI extract config
- only gap categories listed in `selection.from`

Modifies builder by:

- calling the typed `upsert*` method with `{ noOverwrite: true }` for each missing component returned by the CLI — creates new components; collisions with existing ones are logged and skipped (no scalar overwrite)
- adding missing links returned by the CLI (dedup on tuple)
- attaching `source: 'ai-extract'` provenance metadata to AI-discovered graph elements (no confidence score)

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

- calling the typed `upsert*` method with `{ noOverwrite: true }`, supplying only the configured enrichable fields — under `noOverwrite`, already-set scalars are preserved; only `undefined`/`null` fields receive the AI-proposed value
- attaching `source: 'ai-enrich'` provenance metadata to enriched fields (no confidence score)

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

##### Step 7 — `validate`

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

This final artifact is compared against `tests/ground-truth.json` for exact component ID and link tuple coverage.

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

**Exact-match assertion:** Integration tests comparing a live run's builder state against a fixture use set-equality on component IDs and `(source, target, type)` link tuples. Metadata differences are logged but not asserted (per §3.8.3 graph comparison semantics). Under §3.5.2 the `_missing` / `_uncertain` markers are part of the asserted set — a step that accidentally strips an uncertainty marker is a failure.

**Graph comparison semantics:**

- Fixtures are captured by serialising `builder.query().components()`, `builder.query().links()`, and `builder.query().externalLinks()` after each step — no new API is introduced, the existing read surface (§3.5.1) is authoritative.
- Components compared by ID (exact match on full set — no extra, no missing)
- Links compared by (source, target, type) tuple (exact match on full set)
- Metadata differences logged for debugging but not part of pass/fail
- AI-discovered components included in ground truth with `source: 'ai-extract'` / `source: 'ai-enrich'` provenance markers — no confidence score is compared because none is recorded
- `_missing` and `_uncertain` markers (§3.5.2) are part of the fixture and checked for exact match — intermediate states must carry the same uncertainty markers as the ground truth

**Workflow idempotency — split by step type:**

- **Deterministic-only workflows** (no `ai-extract`, no `ai-enrich`): idempotency is **mandatory and CI-verified**. Running the same workflow twice against unchanged inputs must produce byte-equal output JSON under canonical serialisation. This is success criterion #13a, gated by CI.
- **Workflows with AI steps**: idempotency is **not in Phase 13 scope**. AI CLI invocations are non-deterministic unless the user's CLI itself provides pinned-runtime controls (model/version pinning, deterministic inference settings, replayable prompt inputs) — and Phase 13 does not ship or require any such controls. The demo workflow's idempotency test runs under `--skip-ai` (AI steps skipped); the AI-included variant is excluded from CI idempotency assertions and documented as criterion #13b — deferred, with a manual verification procedure published for teams whose CLI provides those controls.

### 3.9 Diagnostics

Failure diagnostics and cross-step observability are first-class concerns. Workflows with 6+ steps, multiple spec sources, and AI involvement produce diagnostics that users must be able to act on.

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

Every built-in step handler catches the builder-error surface and decorates in this style; step-contract doc calls this out as a requirement for third-party step authors too.

**3.9.2 Scalar-conflict observability.** Under last-wins scalar merge (§3.5), an incoming scalar write that **overwrites** an existing value is a silent data-loss path. The builder emits a structured diagnostic (`BuilderWarning` with type `'scalar-overwrite'`) for every such write, accessible via `builder.warnings()` after the step. Each workflow step logs its `.warnings()` delta at step-completion time and includes the count in the step summary (`extract-shipping: imported 42 components, 3 scalar overwrites — see warnings`). The full warning list is written to `<workflow-output-dir>/warnings/<step-name>.json` with a strict schema in `riviere-extract-config`:

```json
{
  "apiVersion": "v1",
  "step": "import-eventcatalog",
  "stepType": "eventcatalog-import",
  "warnings": [
    {
      "type": "scalar-overwrite",
      "componentId": "orders:checkout:Event:orderplaced",
      "field": "description",
      "previousSetBy": "extract-orders",
      "newValue": "Order has been placed by customer"
    }
  ]
}
```

`noOverwrite: true` writes that preserve an existing scalar do **not** emit a warning (they are expected behaviour for AI steps). Only real overwrites do. This gives users a discoverable, diffable signal when a later step wins a scalar conflict, closing the "why did my code description disappear?" gap.

**3.9.3 Workflow-level summary.** At workflow completion, the runtime prints a single summary block:

```text
Workflow 'ecommerce-architecture' completed in 47.2s
  extract-orders         2.1s    imported 18 components, 24 links
  extract-shipping       1.8s    imported 11 components, 16 links
  import-eventcatalog    0.8s    imported 12, skipped 0         (3 scalar overwrites)
  import-asyncapi        0.6s    imported 8, skipped 2          (see unmapped/)
  discover-gaps          9.4s    added 3 components, 5 links
  enrich-metadata       31.2s    filled 14 fields
  validate               1.3s    OK
  Output: ./.riviere/architecture.json
```

No new API for this; it composes the existing step logger + `builder.warnings()` + import-summary counters (§3.4.2). Documented explicitly so the implementation produces the expected format.

| Exclusion                                           | Rationale                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User plugin loading**                             | Phase 13 exports the step contract and uses a registry-based runtime, but does not load user-created plugin packages yet. Built-in steps only in this phase. |
| **Parallel step execution**                         | Steps run sequentially. Parallelization is an optimization for later if needed.                                                                              |
| **TypeScript workflow definitions**                 | YAML + JSON Schema for now. TypeScript config files are a future option for teams wanting type safety and composability.                                     |
| **Workflow state / caching between runs**           | Each run is stateless — produces a complete graph from scratch. Incremental extraction deferred.                                                             |
| **Per-step checkpointing / `--only` single-step rerun** | No builder rehydration from a prior output graph, no checkpoint store, no `--only` flag to re-run a single step. The inner dev-iteration loop for workflow authors is "edit config, re-run full workflow." Deterministic steps are fast; AI cost is the CLI's concern (user's own session caching handles repeated prompts where applicable). Can be revisited in a later phase if the full-rerun cost becomes a real adoption blocker. |
| **OpenAPI, GraphQL, Protobuf, Backstage importers** | Phase 13 includes EventCatalog and AsyncAPI (provide connection data). Component-only importers are lower value, deferred.                                   |
| **Cross-repo linking**                              | Phase 14 scope.                                                                                                                                              |
| **Cross-repo workflow orchestration**               | Phase 14 will define how multi-repo graphs are built.                                                                                                        |
| **Generic workflow engine features**                | No conditionals, loops, branching, retry policies, continue-on-error, or DAG execution. Sequential steps only.                                               |
| **Workflow composition**                            | Workflows cannot reference or import other workflows.                                                                                                        |
| **Workflow migration tooling**                      | Phase 13 ships the `apiVersion: v1` marker on every workflow file and validates it at load time, but does **not** ship automated migration tooling for future format changes. Future breaking changes will bump to `v2` and a migration path will be designed when that need arises. |
| **Step rollback / partial success**                 | If a step fails, the workflow aborts entirely. No partial output, no undo.                                                                                   |
| **Multi-output workflows**                          | One workflow produces one output file. Multiple formats or artifacts require separate workflows.                                                             |
| **Step timeout / resource limits**                  | No per-step time or memory limits.                                                                                                                           |
| **Workflow execution history / audit**              | No tracking of when workflows ran or what changed between runs.                                                                                              |
| **AI SDK dependency, token / cost / rate-limit management, secret loading, retries, prompt caching** | Phase 13 ships zero AI infrastructure. AI steps shell out to a user-configured CLI (§3.4.1). Auth, cost, tokens, rate limits, retries, and caching are the CLI binary's concern — Riviere never touches credentials and makes no SDK dependency. |
| **Pinned-runtime AI idempotency tooling**           | Phase 13 does not ship tooling for deterministic AI execution (pinned model/version, deterministic inference settings, prompt-replay). AI-inclusive workflow idempotency (criterion #13b) is therefore deferred; only deterministic-only idempotency (criterion #13a) is CI-gated. A manual verification procedure is published for teams operating their own pinned runtimes. |

---

## 5. Success Criteria

| #   | Criterion                                                                                                                                                                   | Verification                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Workflow engine executes steps sequentially, passing shared builder between steps                                                                                           | Unit tests for engine with mock step handlers                                                                             |
| 2   | Workflow creates the builder eagerly from workflow `name`, `description`, `sources`, and `domains`, with `output` passed as the graph path argument, before executing steps | Integration test for workflow startup with multiple built-in step types                                                   |
| 3   | `eventcatalog-import` maps EventCatalog data to Riviere components and links via builder, using convention-based defaults                                                   | Integration test against demo app EventCatalog                                                                            |
| 4   | `asyncapi-import` maps AsyncAPI v3 spec to Riviere components and links via builder                                                                                         | Integration test against demo app AsyncAPI spec                                                                           |
| 5   | Builder ships one typed `upsert*` method per component type (`upsertUI`, `upsertApi`, `upsertUseCase`, `upsertDomainOp`, `upsertEvent`, `upsertEventHandler`, `upsertCustom`) with `{ noOverwrite?: boolean }` option, applying last-wins scalar merge by default and preserve-existing-scalar under `noOverwrite`; dedupes links on `(source, target, type)`; makes `addDomain()` / `addSource()` idempotent | Unit tests in riviere-builder covering last-wins scalar merge, `noOverwrite` preservation, array union, type mismatch, per-type required-field validation, link dedup, and `addDomain`/`addSource` idempotency |
| 6   | `ai-extract` discovers components/connections that deterministic extraction missed; AI-added items carry `source: 'ai-extract'` provenance metadata in the output graph (no confidence score recorded)                                  | Integration test against demo app deliberate gaps                                                                         |
| 7   | `ai-enrich` fills missing metadata fields; enriched fields carry `source: 'ai-enrich'` provenance metadata in the output graph (no confidence score recorded)                                                                            | Integration test against demo app components with `_missing` fields                                                       |
| 8   | `riviere workflow run` produces valid graph from demo app workflow matching ground truth                                                                                    | End-to-end test: zero false positives, zero false negatives on component IDs and link (source, target, type) tuples       |
| 9   | `riviere workflow init` produces valid workflow YAML and step configs                                                                                                       | Init creates files, `workflow validate` passes, `workflow run` succeeds                                                   |
| 10  | `riviere workflow validate` catches invalid workflow files, missing config references, incompatible step-declared domains/sources, invalid step configs, and unresolved runtime prerequisites from `requiredServices()` (notably: the AI CLI binary not being in `PATH`) | Unit tests for structural, semantic, and runtime-prerequisite validation; explicit test that a workflow with `ai-extract` whose `command:` references a non-existent binary fails `workflow validate` before execution |
| 11  | Workflow JSON Schema validates workflow file structure                                                                                                                      | Schema published in `riviere-extract-config`                                                                              |
| 12  | `riviere-workflow` exports the step contract and resolves built-in steps through a registry rather than hardcoded switch logic                                              | Unit tests for step registry + dependency-cruiser rule enforcement                                                        |
| 13a | Workflows with **only deterministic steps** (no `ai-extract`, no `ai-enrich`) are bit-for-bit idempotent: running twice produces identical output JSON (after canonical-serialisation normalisation)                                                                                                                                | E2E test in CI: demo workflow with AI steps disabled, run twice, assert byte-equal output JSON. Mandatory gate. |
| 13b | Workflows with AI steps are idempotent **only under pinned-runtime conditions** (pinned model/version, deterministic inference controls, replayable prompt inputs). Phase 13 does not ship pinned-runtime tooling; this criterion is explicitly deferred                                                                             | Documented as not-in-scope; no CI gate. A manual verification procedure is published so teams with pinned runtimes can self-verify. |
| 14  | AI step configs validate bounded enum-based selection and field lists rather than free-form strings                                                                         | Schema validation tests in `riviere-extract-config`                                                                       |
| 15  | Canonical identity normalization happens in step config/mappings, not in the workflow runtime                                                                               | Integration test: differently named external records merge only when mappings normalize them to the same Riviere identity |
| 16  | `schema-validate` works as an optional explicit checkpoint while final output still always validates                                                                        | Integration test with and without `schema-validate` step                                                                  |
| 17  | Step summary output shows per-step duration and total workflow duration                                                                                                     | Visible in `riviere workflow run` output                                                                                  |
| 18  | The documented ecommerce demo app workflow transitions are verified after each step, not only at final output                                                               | Integration test compares builder state after each step to `tests/workflow-transitions/*.json` fixtures                   |
| 19  | Every Phase 13 schema (workflow YAML, step configs, mapping files, builder inputs) rejects empty strings on all string fields via `minLength: 1` or equivalent              | Schema-level tests assert that `""` on every string field produces a validation error                                     |
| 20  | `riviere-schema` propagates `_missing?: string[]` on Component and `_uncertain?: string` on Link through to final output; `toRiviereGraph()` preserves them                  | Unit tests for schema extension + extract-ts → builder round-trip + serialisation                                         |
| 21  | `RiviereQuery` gains `componentsWithMissingFields(fields?)` and `uncertainLinks()` returning typed results driven by the new schema fields                                  | Unit tests in `riviere-query` covering both helpers, including empty-result and intersection cases                        |
| 22  | `ai-extract` gap categories (`uncertain-links`, `missing-events`, `missing-event-handlers`, `missing-use-cases`) each have a documented computation rule and a passing test  | Integration tests assert each gap category produces the expected candidate set against demo-app fixtures                   |
| 23  | `schema-validate` uses `builder.validate()` (non-throwing) so it can run as an intermediate checkpoint without aborting on merely incomplete state                           | Integration test: insert `schema-validate` mid-workflow, assert it reports errors but does not throw from `build()`        |
| 24  | `riviere-extract-ts` exposes a pure `extractInto(builder, config, options)` core that feeds a caller-supplied builder without writing JSON; `riviere extract` CLI is rewritten as a thin shell over this core; existing CLI behaviour is unchanged | Unit tests for the pure core; existing `riviere extract` integration tests pass against the refactored CLI with no change in output JSON |
| 25  | `code-extraction` workflow step calls the same pure core used by `riviere extract` CLI — zero behaviour divergence; lenient-mode `_missing` / `_uncertain` markers propagate to the shared builder                                     | Integration test: running `riviere extract --config X` and running a workflow with a single `code-extraction` step using the same config produce identical component and link sets (modulo workflow-added metadata) |
| 26  | ts-morph `Project` instances created during `code-extraction` are disposed before the step returns; multiple `code-extraction` steps in one workflow run do not retain compiler state between steps                                         | Memory-pressure test: run 5 `code-extraction` steps sequentially in one process; assert retained-heap after each step is bounded |
| 27  | `ecommerce-demo-app` repo (separate) satisfies all M0 acceptance criteria (§3.7.1 D0.1–D0.10) before any other milestone can claim a §3.8-dependent success criterion                                                                                 | Cross-repo gate: `living-architecture` CI pins a commit SHA from `ecommerce-demo-app`; pinning requires M0 checklist sign-off in the demo-app PR |
| 28  | Phase 13 integration and E2E tests fetch `ecommerce-demo-app` at the pinned SHA and run against it; no demo-app source or fixture lives in `living-architecture`                                                                                      | Grep in `living-architecture` for demo-app source returns empty; CI test harness clones the demo-app at the pinned SHA         |
| 29  | `eventcatalog-import.yaml`, `eventcatalog-mappings.yaml`, `asyncapi-import.yaml`, and `asyncapi-mappings.yaml` are all validated by JSON Schemas published in `riviere-extract-config`; step handlers' `validateConfig()` runs the schema check at `workflow validate` time | Schema tests: invalid shapes (typos on keys, empty strings, unknown top-level keys, missing required fields) fail `workflow validate`; valid demo-app mapping files pass |
| 30  | `riviere workflow init` refuses to run when existing `riviere-config.yaml` files are detected in the target directory, printing the list of detected configs and pointing to the migration guide; `docs/workflow/migrating-from-extract.md` is published and describes the five-step manual upgrade path | Integration test: run `init` in a directory with a seeded `riviere-config.yaml`, assert non-zero exit, no files created, stderr names the detected config and migration-guide path |
| 31  | All path fields (in workflow YAML and in every step config file) are resolved relative to the directory of the file they appear in — never relative to `cwd`; a shared `resolveRelativeToConfig(configPath, rawPath)` utility is exported by `riviere-workflow` and used by every built-in step handler; `~` is not expanded | Integration tests: run the demo workflow from two different working directories and assert identical output; unit tests for the resolver cover relative, absolute, backslash/forward-slash, and `~` cases |
| 32  | Workflow YAML requires a top-level `apiVersion: v1` field; missing or unknown values fail `workflow validate` before any other structural check with the documented error message                                                                                            | Schema test: YAML without `apiVersion`, with `apiVersion: ""`, with `apiVersion: v2`, or with any other value all fail; `apiVersion: v1` passes                        |
| 33  | AI steps (`ai-extract`, `ai-enrich`) invoke the CLI declared in their `command:` field via `child_process.spawn` (shell: false), pipe the prompt via stdin, capture stdout, validate it against the response schema in `riviere-extract-config`, enforce `timeout-seconds`, and apply results to the builder via typed `upsert*` with `{ noOverwrite: true }`. Riviere imports no AI SDK and reads no API-key env vars | Unit tests with mocked child_process; integration test with a tiny stub CLI script (echoes a canned JSON response) and assertion that Riviere depends on no AI SDK (`grep` in `riviere-workflow` package.json for `anthropic`/`openai`/`ai` SDK names returns empty); timeout test kills the child process |
| 34  | `riviere workflow run --dry-run` executes deterministic steps normally but skips every AI CLI invocation, printing the would-be prompt to stdout. `--skip-ai` skips AI steps entirely with no prompt construction                                                              | Integration tests: `--dry-run` produces prompts but no graph mutation from AI steps; `--skip-ai` produces deterministic-only output identical to an equivalent workflow with the AI steps removed                |
| 35  | `steps[].name` is unique across the workflow, matches `^[a-z0-9-]+$`, and `minLength: 1`; duplicates and invalid characters fail structural validation with the documented error message                                                                                     | Schema tests: duplicate names, uppercase names, names with spaces or underscores, and empty names all fail; compliant names pass |
| 36  | Lenient-mode `eventcatalog-import` / `asyncapi-import` runs emit a one-line `imported N, skipped M` summary in step logs and write a structured `<workflow-output-dir>/unmapped/<step-name>.json` file per §3.4.2 schema                                                     | Integration test: seed a mapping file with some unresolvable records, run with `allow-unmapped: true`, assert the log line and JSON file contents match the documented schema; strict mode produces no file    |
| 37  | `asyncapi-import` consumes only the v3 fields listed in the exhaustive scope table (§3.4); drops infrastructure fields (servers, bindings, traits); fails validation on `operations.*.reply`; tolerates unrecognised top-level keys without failure                           | Spec-driven tests: a v3 spec with a reply operation fails; a spec with only publish/subscribe operations passes; dropped fields produce no warnings and no graph mutation                                     |
| 38  | All enum fields in Phase 13 schemas that exist in `riviere-schema` (notably `SystemType`, `ComponentType`, `LinkType`) are referenced via JSON Schema `$ref`, not redeclared                                                                                                  | Schema tests: adding a new value to `SystemType` in `riviere-schema` is automatically accepted by workflow-validate without touching Phase 13 schemas                                                         |
| 39  | Builder errors surfaced through step handlers are decorated with step-level context (step name, type, source record id, mapping file + line where applicable) per §3.9.1                                                                                                     | Integration tests trigger each built-in step's error paths (type mismatch, duplicate, unmapped) and assert the error message contains the required context fields                                             |
| 40  | Every scalar overwrite under last-wins emits a `scalar-overwrite` `BuilderWarning`; each step's warnings are written to `<workflow-output-dir>/warnings/<step-name>.json` per §3.9.2 schema; writes under `{ noOverwrite: true }` that preserve existing scalars do NOT warn | Unit tests for `BuilderWarning` emission; integration test asserts the warnings JSON file shape and that AI-step `noOverwrite` writes produce no warnings                                                     |
| 41  | `workflow run` prints a workflow-level summary block at completion per §3.9.3, including per-step duration, imported/skipped counts, and scalar-overwrite counts                                                                                                              | Golden-output integration test asserts the summary block format exactly                                                                                                                                       |
| 42  | Per-step transition fixtures in the demo-app repo are generated via the documented capture procedure (§3.8.3 fixture generation) by serialising `builder.query()` reads after each step — fixtures are never hand-edited                                                      | Demo-app repo includes the capture-hook tooling and a CI check that regenerating fixtures against a known-good run produces identical files                                                                   |
| 43  | Workflow `output` is required (no default); missing or empty `output` fails structural validation                                                                                                                                                                             | Schema tests: workflow without `output` fails; `output: ""` fails; any non-empty string passes                                                                                                                 |
| 44  | `ai-extract` source-scope overflow (files > `max-files-per-batch * max-batches`) fails the step with the documented error — silent truncation is disallowed                                                                                                                  | Integration test seeds a source tree with enough files to exceed the bound and asserts the step fails with the documented message                                                                              |
| 45  | `riviere-workflow` package follows monorepo repository hygiene: separation-of-concerns folder structure, dependency-cruiser rules added to the root config, role-enforcement tags on every export, 100% test coverage, workspace-reference imports only                      | Lint + dependency-cruiser + coverage gates green on CI                                                                                                                                                         |

---

## 6. Open Questions

1. **EventCatalog ingestion approach** — **Resolved (with required pre-work).**

   - Default: SDK-first via `@eventcatalog/sdk`.
   - Pre-work: an **M0 spike** (part of the demo-app deliverables) verifies that the SDK exposes every relationship `eventcatalog-import` consumes (domains, services, events, producer/consumer relationships). If any relationship is unreachable through the SDK, the spike documents which fields require file-first fallback (frontmatter + MDX parsing of the EventCatalog content directory) and the M0 demo-app PR includes the fallback parser. M2 (`eventcatalog-import` step) cannot start until this spike has either confirmed full SDK coverage or merged the fallback parser.
   - Reasoning: the SDK's relationship coverage was the single biggest integration unknown. Treating it as a spike and gating M2 on the result removes the risk that `eventcatalog-import` ends up half-implemented when the SDK doesn't deliver.

   **Spike acceptance:** demo-app M0 PR includes either (a) a passing test that loads the demo EventCatalog instance via the SDK and yields all required fields, or (b) a fallback file-parser plus a passing test against the same instance.

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

3. **AI provider setup** — **Resolved.** Phase 13 ships no AI SDK, no provider abstraction, and no credential handling. AI steps shell out to a user-configured CLI (`command:` in each step config). Auth and provider choice are the CLI binary's concern. See §3.4.1.

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

- **No SDK dependency.** AI steps shell out to a user-configured CLI via `child_process.spawn` — see §3.4.1.
- Prompt strategies for bounded code analysis are owned by the step handler code; prompts are constructed deterministically from builder state and a step-type-specific template. Riviere does not ask the CLI to self-report confidence and does not record a confidence score on AI-added graph elements.
- Response JSON schemas (one per AI step type) published in `riviere-extract-config` and used to validate CLI stdout before the response is applied to the builder.

---

## 9. Terminology

| Term                       | Definition                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Workflow**               | A YAML definition specifying a sequence of steps that produce a complete Riviere graph. The primary interface for using Riviere.                                         |
| **Step**                   | A single unit of work in a workflow. Receives the builder, performs extraction/import/analysis, adds to the graph. Implements `WorkflowStepHandler`.                     |
| **Step Type**              | A category of step with specific behavior: `code-extraction`, `eventcatalog-import`, `asyncapi-import`, `ai-extract`, `ai-enrich`, `schema-validate`.                    |
| **Step Config**            | Configuration specific to a step type, stored in a separate file referenced by the workflow. Not part of the workflow definition.                                        |
| **Workflow Step Services** | Fixed runtime services passed to every step through `StepContext.services`. Phase 13 ships none — the field exists for future extensibility. AI steps acquire their runtime via a shelled-out CLI declared in step config (§3.4.1). |
| **AI CLI**                 | The user-configured command-line tool that Riviere's AI steps invoke via `child_process.spawn` (e.g. `claude -p`, `codex`, `ollama run`). Riviere never imports an AI SDK — the CLI binary handles auth, cost, tokens, rate limits, retries, and model selection. Configured per AI step via the `command:` field.             |
| **Mappings File**          | Configuration defining how external data models (EventCatalog, AsyncAPI) map to Riviere concepts. Convention-based defaults with explicit overrides.                     |
| **Canonical Identity**     | The final Riviere component identity produced by a step's mapping/config logic before the builder sees the component. Upsert happens after this identity is established. |
| **Upsert**                 | Typed builder capability (one `upsert*` method per component type) to add-or-merge a component. If the component ID already exists, scalar fields are merged **last-wins** by default (or preserved under `{ noOverwrite: true }`) and array fields union. If not, it creates the component. Enables multi-source graph construction. |
| **noOverwrite**            | Option on every `upsert*` method. When `true`, scalar writes apply only to fields whose existing value is `undefined`/`null`; already-set scalars are preserved. Arrays still union. AI steps always pass `noOverwrite: true` so they never disturb values set by earlier deterministic steps. |
| **Workflow Init**          | Interactive CLI command (`riviere workflow init`) that creates a workflow definition and all step configs. The setup process for new workflows.                          |
