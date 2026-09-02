# PRD: Phase 13 — Extraction Workflows

**Status:** Approved

**Approval note:** Approved on 2026-09-01 after reviewing the implementation on `main`. Architecture review closed the aggregate/entity/stage ownership, package-boundary, adapter-isolation, and Builder seam questions. Section 7.0 is the approved remaining-delivery baseline for issue creation.

**Architecture reconciliation:** Approved on 2026-09-01 after reviewing the implementation on `main`. `RiviereProject` remains the sole aggregate and owns its private `RiviereBuilder` plus `Workflow` aggregate entities. Each `Workflow` owns identity, run state, ordered progression, fail-fast behaviour, events, diagnostics, and immutable typed `WorkflowStage` values. There is no second workflow runtime owner or aggregate and no dedicated `riviere-workflow` package in Phase 13. The current `riviere-extract-ts` domain-model and use-case packages remain the owning subdomain boundary for this delivery.

**Canonical planning artefacts:** The product, architecture, dogfooding, and delivery authorities used for implementation tasks live under `docs/project/PRD/phase-13-extraction-workflows/`. This consolidated active reference must stay consistent with those separated artefacts.

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

**Workflows are the primary interface for users who need more than one source of truth.** For a single TypeScript codebase with no external specs and no AI, `riviere extract --config <file>` is still the shortest path. Workflows become valuable, and become the standard, as soon as a user has any combination of multiple codebases, external specs, or AI-driven gap filling. A typical user who starts with `riviere extract` grows into workflows by wrapping the existing extraction config in a one-stage Workflow (see §3.6) and adding stages as new sources appear.

**Who uses workflows:** Anyone composing more than one source of architecture truth. Individual developers aggregating several domain codebases; platform teams wiring spec imports alongside code extraction; CI pipelines. Users with a single-codebase happy path stay on `riviere extract`.

---

## 2. Design Principles

### 2.1 Workflows Are Riviere Workflows

This is not a generic workflow engine. Workflows are purpose-built for Riviere extraction. `RiviereProject` owns the private `RiviereBuilder`; its Workflow entity progresses typed stages, and Project/Workflow domain behaviour calls the published Builder API to construct the graph. The Builder remains the source of truth for graph construction, identity, occurrence handling, and graph validation. **The earlier builder-facade decision is superseded. See Appendix A.**

**Trade-off:** We sacrifice generality for simplicity and correctness. A generic engine would require intermediate representations, merge logic, and format translation. Builder-centric workflows get all of that for free from the existing builder infrastructure.

### 2.2 Sources of Truth First

**If a source of truth exists, use it.** Don't analyze code when a spec already describes the architecture.

| Priority (on scalar merge) | Source                | Example                            | Where it runs in the workflow                   |
| -------------------------- | --------------------- | ---------------------------------- | ----------------------------------------------- |
| 1 — highest                | Existing specs        | AsyncAPI, EventCatalog             | Last among deterministic stages                 |
| 2                          | Code with conventions | Golden Path extraction (Phase 12)  | Before spec imports                             |
| 3                          | Code with patterns    | Configurable extraction (Phase 12) | Before spec imports                             |
| 4 — additive only          | AI discovery          | Fill gaps, enrich metadata         | After all deterministic stages, non-overwriting |

**Ordering doctrine — "last-wins, highest-priority runs last":** Scalar-field merge semantics in the Builder are last-wins (§3.5). Workflow stage order therefore reads bottom-up the priority table: lower-priority deterministic sources run first so higher-priority deterministic sources can overwrite them. Spec imports (priority 1) run last among deterministic stages; their scalar values become authoritative.

**AI is the exception:** AI stages (`ai-extract`, `ai-enrich`) are **additive-only**. They never overwrite an already-set scalar field. They run after all deterministic stages so they can see the merged graph and target gaps, but because they are additive-only they don't need to be ordered for priority — they can't win scalar conflicts by construction.

Teams that maintain AsyncAPI specs for their events shouldn't need to configure event extraction rules — the workflow imports the spec directly, and the spec import (running after any code extraction) overwrites anything code may have put in the same field.

### 2.3 Stages Own Their Config

Config files are the source of truth for stage behaviour. The Workflow composes them.

The workflow file defines:

- graph-wide builder inputs (`name`, `description`, `output`, `sources`, `domains`)
- stage execution order
- which config file each stage uses

Each stage config defines everything about how that capability behaves: extraction rules, mappings, modules, AI selection rules, and other graph-affecting behaviour.

**Rationale:** A user must get the same behavior from direct CLI usage and workflow usage. If a rule belongs to the capability itself, it belongs in the capability config. The workflow composes those capabilities into one graph build.

### 2.4 CI-First

Workflows must run in CI without human intervention. `riviere workflow run ./riviere-workflow.yaml` is a single command that produces a complete graph. No interactive prompts during execution. Setup is interactive (`riviere workflow init`); execution is fully automated.

### 2.5 Incremental Learning

When a user refines a mapping or otherwise updates a stage config after reviewing workflow output, that correction lives in config files, not persisted run state. Future runs use the updated configs. Phase 13 does not include an automated AI review-and-accept loop.

### 2.6 Strict Schemas, No Workarounds

Every schema introduced or extended by Phase 13 (workflow YAML, stage configs, mappings files, Builder inputs) must be strict by default:

- **Mandatory string fields** have `minLength: 1` (or equivalent). Empty strings are never valid input.
- **Optional fields** are omitted when unset, not set to `""`. Schema still rejects `""` if the key is present.
- **Enums over free-form strings** wherever the set of valid values is known (e.g. `selection.from`, `selection.component-types`, `fields`, `systemType`).
- **No "tolerant merge" special-cases** for workaround values. Invalid input fails at the schema boundary, not in downstream merge/consumer code.

This is the same strictness convention `riviere-schema` already applies (see `packages/riviere-schema/src/minlength-*.spec.ts`); Phase 13 extends it across every new schema it introduces.

### 2.7 Project-Owned Workflow Model, Built-In Stages First

Phase 13 extends the existing project-owned workflow model rather than adding a second runtime owner. `RiviereProject` is the sole aggregate. It owns one private `RiviereBuilder` and its `Workflow` entities. A `Workflow` owns the ordered stage loop, active-plan derivation, progression, fail-fast behaviour, events, diagnostics, and warnings.

`WorkflowStage` is an immutable value object represented by one closed, exhaustively matched union. Phase 13 adds these built-in variants: `code-extraction`, `eventcatalog-import`, `asyncapi-import`, `ai-extract`, `ai-enrich`, and `schema-validate`. User plugin loading and custom stage types are out of scope, so Phase 13 does not add a generic registry, string-keyed handler map, extension API, or new workflow-runtime role.

The Project supplies the selected Workflow with its private Builder and an explicit stage-execution operation. The Workflow invokes that operation for each active stage; the use case, repository, shell, and CLI entrypoint never own the stage loop.

**Stages are isolated.** A stage execution can access only:

- its own validated typed configuration
- the Project-owned Builder supplied by the Workflow
- Workflow-owned diagnostics and event recording
- the exact external capability required by that stage

No stage reads another stage's config or owns workflow progression. Cross-stage diagnostics remain explicit Workflow state rather than hidden coupling.

**Adapter isolation rule:** `RiviereProject` depends on domain ports for external facts and actions needed by EventCatalog, AsyncAPI, and AI stages. Port adapters live in `packages/riviere-extract-ts/use-cases/src/features/extract/adapters/`; direct imports of `@eventcatalog/sdk`, `@asyncapi/parser`, and Node `child_process` remain confined to `packages/riviere-extract-ts/use-cases/src/infra/external-clients/`. The aggregate, Workflow, stages, use cases, repository, and CLI do not import those vendor APIs directly.

**Aggregate-repository loading-method rule:** Every public aggregate-loading method on an `aggregate-repository` is named exactly `load` or begins with `loadBy` followed by the real aggregate access criterion. The role check enforces the lexical contract; semantic review rejects operation-labelled names that merely satisfy the prefix. `loadWorkflow`, `loadForEnrichment`, `loadFromPersistedState`, bare `loadBy`, and `loadByEnrichment` are invalid. `load`, `loadById`, `loadByGraphPath`, `loadByExtractionConfigPath`, `loadByExtractionConfigAndDraftComponentsPaths`, and the temporary current-state method `loadByWorkflowName` are valid. Optional persistence methods such as `save` and private repository assembly helpers are outside this loading-method naming constraint.

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

stages:
  - name: extract-orders
    kind: code-extraction
    config: ./orders/riviere-config.yaml

  - name: extract-shipping
    kind: code-extraction
    config: ./shipping/riviere-config.yaml

  - name: import-events
    kind: eventcatalog-import
    config: ./specs/eventcatalog-import.yaml

  - name: import-broker
    kind: asyncapi-import
    config: ./specs/asyncapi-import.yaml

  - name: discover-gaps
    kind: ai-extract
    config: ./stages/ai-extract.yaml

  - name: enrich-metadata
    kind: ai-enrich
    config: ./stages/ai-enrich.yaml

  - name: validate
    kind: schema-validate
```

**Execution model:** Stages run sequentially, top to bottom. `RiviereProject` starts each rebuild with fresh Builder state and passes that private `RiviereBuilder` to its selected Workflow. Builder state accumulates across completed stages. If a stage fails, the Workflow aborts, aggregate state rolls back, any prior graph output remains unchanged, and the structured Workflow log remains available for debugging. **The earlier builder-facade decision is superseded. See Appendix A.**

**Stage order is semantic (last-wins).** When multiple stages set the same scalar field on the same canonical component, **the later stage wins**. Recommended order follows the priority doctrine in §2.2:

1. `code-extraction` stages first (lowest priority — overwritten by higher-priority sources)
2. `eventcatalog-import` / `asyncapi-import` next (highest deterministic priority — authoritative scalar values)
3. `ai-extract` / `ai-enrich` last (additive-only — never overwrite existing scalars)
4. `schema-validate` optional terminal stage

AI stages must run after deterministic stages because they read current Builder state to find gaps, and they never participate in scalar merge (they only add new components/Links or fill strictly-unset fields).

**Workflow schema:** JSON Schema validates the workflow file structure (`apiVersion`, `name`, `output`, `sources`, `domains`, `stages[].name`, `stages[].kind`, and `stages[].config` for stages that require config). `stages[].kind` references the published `WorkflowStageKind` language rather than redeclaring unchecked strings. The repository validates and narrows each referenced config to the published type for its stage before constructing the Project; Project-owned compatibility rules then validate the complete Workflow definition. The unpublished `version: 1` fixed-stage dialect on current `main` is replaced rather than supported in parallel.

**`output` is required (no default).** Workflow files must specify `output` explicitly; there is no implicit `./.riviere/architecture.json`. Missing or empty `output` fails structural validation. Rationale: silent defaults lead to "where did my graph go?" confusion, especially across workflow files in different subdirectories (each resolves relative to its own file per §3.1 path rules). Being explicit costs one line and removes the ambiguity.

**Stage name uniqueness.** `stages[].name` values must be unique within a Workflow. Structural validation rejects duplicates with a clear message: `duplicate stage name '<name>' at positions N and M — every stage in a workflow must have a unique name`. Stage names are used for logs and timing summaries; ambiguous names produce unusable diagnostics. Names match `^[a-z0-9-]+$` (lowercase, digits, hyphens only, `minLength: 1`).

**Shared enum references.** Every enum field in the workflow schema that exists in `riviere-schema` is referenced via JSON Schema `$ref` rather than redeclared:

- `domains.*.systemType` — `$ref`s `SystemType` from `riviere-schema` (currently `'domain' | 'bff' | 'ui' | 'external-service' | 'other'`).
- Component-type enums in stage configs (e.g. `selection.component-types`) — `$ref` the `ComponentType` enum from `riviere-schema`.
- Link-type enums in stage configs — `$ref` the `LinkType` enum from `riviere-schema`.

This guarantees that when `riviere-schema` evolves (e.g. adds a new `SystemType` value), workflow-validate immediately accepts it without a separate Phase-13-schema update. Redeclaring enums is forbidden in Phase 13 schemas — if an enum lives in `riviere-schema`, it is referenced, not duplicated.

**Required `apiVersion` field.** Every workflow YAML must declare `apiVersion` as its first top-level key. Phase 13 accepts exactly `v1`. The loader checks `apiVersion` **before** any other structural validation; an unknown or missing value fails with: `unsupported workflow apiVersion '<value>'; this CLI understands: v1`. This costs one line in every workflow file today and guarantees that a future breaking change to the workflow format gets a clear, actionable error instead of silent misbehaviour. The field is a constant string enum, no coercion. Same strictness rules as §2.6. **Only the top-level workflow file is versioned in Phase 13.** Referenced stage config files and mapping files are interpreted according to the workflow `apiVersion` and the schema for the stage kind that references them.

**Output:** Always the result of `builder.build()` — a validated `RiviereGraph` written as JSON to the `output` path. One output file per workflow.

**Boundary rule:** Workflow YAML may declare graph-wide Builder inputs. It may not override stage behaviour. Fields like connection patterns, `allow-incomplete`, import mappings, and AI field selection belong in stage config files.

**Path resolution rule (file-relative, not cwd-relative):**

- Every path field in the workflow YAML (`output`, `stages[].config`) resolves **relative to the directory containing the workflow file**, not to the process `cwd`.
- Every path field inside a stage config (e.g. `source`, `mappings`, `sources[]` in AI configs, any TypeScript `tsconfig` path in extraction configs) resolves **relative to the directory containing that stage config file**, not the workflow file and not `cwd`.
- Absolute paths are accepted as-is.
- `~` is **not** expanded. Users write absolute paths explicitly if they want a home-directory reference.
- Path normalisation uses Node's `path.resolve`; YAML authors write forward-slash paths (`./specs/eventcatalog-import.yaml`) which work on Windows and POSIX identically. The repository normalises separators on load.
- `RiviereProjectRepository` constructs every file-system-facing string by resolving it against the file where it was declared; aggregate behaviour never reads a raw YAML path. The path resolver is repository-owned loading behaviour shared by workflow and stage-config materialisation.

This rule makes `riviere workflow run ./ecommerce-demo-app/riviere-workflow.yaml` and `cd ecommerce-demo-app && riviere workflow run ./riviere-workflow.yaml` produce identical behaviour; cwd is never part of path resolution. The same applies to nested stage configs.

### 3.2 Workflow Entity and Stage Model

The workflow model uses the existing aggregate boundary and closed stage language:

```typescript
type WorkflowStageValue =
  | { kind: 'code-extraction'; name: string; config: CodeExtractionConfig }
  | { kind: 'eventcatalog-import'; name: string; config: EventCatalogImportConfig }
  | { kind: 'asyncapi-import'; name: string; config: AsyncApiImportConfig }
  | { kind: 'ai-extract'; name: string; config: AiExtractConfig }
  | { kind: 'ai-enrich'; name: string; config: AiEnrichConfig }
  | { kind: 'schema-validate'; name: string }

type WorkflowStateSnapshot = Readonly<{
  components: readonly Component[]
  diagnostics: readonly WorkflowDiagnostic[]
  externalLinks: readonly ExternalLink[]
  links: readonly Link[]
}>

type WorkflowTransitionSnapshot =
  | Readonly<{ kind: 'initial'; state: WorkflowStateSnapshot }>
  | Readonly<{
      kind: 'stage-completed'
      stageIndex: number
      stageKind: WorkflowStageValue['kind']
      stageName: string
      state: WorkflowStateSnapshot
    }>

interface AiCli {
  checkAvailability(command: string): AiCliAvailability
  run(input: RunAiCliInput): RunAiCliResult
}

class RiviereProject {
  rebuildGraph(mode: WorkflowRunMode): WorkflowRunResult {
    const workflow = this.loadedWorkflow
    const previousBuilder = this.builder
    this.builder = previousBuilder.fresh()
    const result = workflow.run(this.builder, mode, (stage, context) =>
      this.executeWorkflowStage(stage, context),
    )
    if (!result.success) this.builder = previousBuilder
    return result.success ? { ...result, graph: this.builder.build() } : result
  }
}

class Workflow {
  run(
    builder: RiviereBuilder,
    mode: WorkflowRunMode,
    executeStage: ExecuteWorkflowStage,
  ): WorkflowRunResult {
    for (const stage of this.activeStages(mode)) {
      const result = executeStage(stage, this.contextFor(stage, builder))
      if (!result.success) return this.fail(stage, result)
      this.recordSuccess(stage, result)
    }
    return this.complete()
  }
}
```

The code is illustrative of the approved ownership and call direction; implementation names may vary only when the same responsibilities and role boundaries remain explicit.

`WorkflowStage` remains a `value-object`: it is immutable, defined by its stage kind, unique name, and validated typed configuration, and has no lifecycle independent of its owning Workflow. The Workflow is an `aggregate-entity`: it owns identity and changing run state inside `RiviereProject` and cannot be loaded or run independently.

The union is closed and must be matched exhaustively. Phase 13 does not resolve stage kinds through unchecked strings, default branches, a generic handler registry, or arbitrary shell commands. Adding a future built-in stage changes the published stage language and must fail compilation until every parser, validator, execution path, CLI presenter, and test handles the new variant.

Workflow configuration parsing and aggregate loading happen before execution. Each config file is validated and narrowed to the imported published-language type for its stage. Both `workflow validate` and `workflow run` load and validate the complete Project. The Workflow then derives the active plan from `--skip-ai` or `--dry-run`; executable lookup applies only to an AI stage that will actually invoke its CLI.

External capabilities remain explicit domain ports:

- EventCatalog source loading
- AsyncAPI document loading
- stage-scoped TypeScript extraction materialisation
- one cohesive AI CLI capability with `checkAvailability(...)` and `run(...)`

Generic external clients implement only the technical SDK, parser, process, or filesystem interaction. Domain-port adapters translate those external results into the exact domain input required by `RiviereProject`; they do not own stage ordering, Builder mutation, mapping rules, or diagnostics decisions.

The CLI shell constructs each generic client and domain-port adapter, then injects the domain-port implementations into `RiviereProjectRepository`. The repository keeps those collaborators as required readonly constructor dependencies and supplies them when it constructs `RiviereProject`. Repository methods load only persisted Project state; ports are never repository-load inputs, persisted values, optional dependencies, or production no-op defaults. The aggregate keeps the ports as private readonly collaborators and invokes them only from the stage behaviour that owns the decision.

Every Workflow run returns one immutable `initial` transition snapshot plus one immutable `stage-completed` snapshot after each completed active stage. Each snapshot contains the exact accumulated components, internal Link occurrences, external Links, and Workflow diagnostics at that boundary. These are supported production result values, not a test-only hook. Failed stages do not produce a completed-stage snapshot. `schema-validate` produces an after-stage snapshot equal to its preceding snapshot.

The Project passes its private `RiviereBuilder` to the selected Workflow. The Workflow owns stage progression and gives each execution only its own stage context. Workflow diagnostics remain separate Workflow state. No graph-write port, Builder adapter, facade, graph-application service, generic orchestrator, or second workflow aggregate is introduced. See Appendix A.

### 3.3 Builder Creation and Workflow Compatibility Rules

The underlying builder requires `sources` and `domains` at construction (`RiviereBuilder.new()`). `RiviereProject` therefore starts fresh Builder state from the workflow's top-level graph definition before the Workflow begins execution.

**How it works (aligned with `workflow run` in §3.6):**

1. Load workflow YAML; assert `apiVersion: v1`
2. Structural validation of intrinsic workflow shape
3. Validate and narrow every referenced config and construct the complete `RiviereProject`
4. Ask the selected Workflow to derive its effective execution plan for the current run mode, then validate runtime prerequisites only for stages that will invoke an external capability
5. Ask `RiviereProject` to start fresh Builder state from `{ name, description, sources, domains }`, then pass that Builder directly to the selected Workflow after validation passes
6. Execute stages sequentially with that concrete Builder
7. On success: `builder.build()` → write JSON to `output` path
8. On failure at any stage: abort, restore prior aggregate state, exit non-zero

**Why the Workflow owns this data:** `sources` and `domains` are graph-wide Builder inputs, not stage-local behaviour. Modules remain stage-local because the Builder does not require a global module registry.

**Compatibility rule:** Stage configs may still declare sources and domains for standalone direct usage. During Workflow execution:

- any domain referenced by a stage config must exist in the Workflow's `domains`
- source identity is the `repository` field from `SourceInfo`; any source declared by a stage config must match a Workflow source with the same `repository`
- if both Workflow and stage config specify `commit` for the same source, the values must match exactly
- if a stage config includes metadata for a Workflow-declared domain, `description` and `systemType` must match exactly

**`addDomain()` becomes idempotent:** If a domain with the same name already exists, the call is a no-op (no error). Same for `addSource()`.

### 3.4 Built-in Stage Kinds

#### `code-extraction`

Runs the Phase 10/11/12 extraction pipeline against a TypeScript codebase, feeding discovered components and links into the shared workflow builder.

```yaml
- name: extract-orders
  kind: code-extraction
  config: ./orders/riviere-config.yaml # Extraction config (Phase 11 format)
```

The extraction config remains the source of truth for extraction behavior — detection rules, metadata extraction, connection patterns, strictness, and modules. Workflow usage must behave the same as direct CLI usage with the same extraction config.

The extraction config may still declare sources and domains for standalone usage. In a workflow run, those declarations are validated against the workflow's top-level `sources` and `domains`.

**Required extraction integration:** Direct extraction and workflow extraction both operate through `RiviereProject`. The Builder remains private aggregate state; extraction does not receive a graph write port or Builder adapter.

1. `RiviereProjectRepository` loads the complete Project state required by the operation.
2. Direct `riviere extract` invokes the existing `RiviereProject` extraction operation and preserves current CLI input and output behaviour.
3. A `code-extraction` Workflow stage invokes the same Project extraction behaviour. Its result is applied through Project graph operations to the Builder owned by the Project.
4. Same-stage duplicate component emission still fails. Merge and upsert behaviour applies only to graph state contributed by earlier completed stages.
5. Lenient-mode missing and uncertain state becomes structured Workflow diagnostics rather than graph fields. It never enters `riviere-schema`.
6. Per-stage ts-morph Projects and their containing extraction configuration/module state become unreachable before the stage completes, so multiple `code-extraction` stages do not retain compiler state. The implementation must use a real lifecycle supported by ts-morph rather than requiring a nonexistent `dispose()` operation.

This integration lands in `riviere-extract-ts` and `riviere-cli` as a prerequisite of the `code-extraction` stage. See success criterion #24.

**Non-goal:** changing extraction behaviour itself. The refactor is purely a structural separation of concerns — current tests for `riviere extract` must continue to pass unchanged against the rewritten CLI shell.

#### `eventcatalog-import`

Imports components and connections from an EventCatalog instance. `RiviereProject` depends on an explicit EventCatalog source-loading port. A use-case adapter implements that port over a generic client backed by `@eventcatalog/sdk`; only the generic client imports the SDK. The Project owns mapping, canonical identity, graph mutation, and diagnostics decisions.

```yaml
- name: import-events
  kind: eventcatalog-import
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

EventCatalog producer/consumer relationships must resolve to canonical Riviere component identities before Links are created. If a mapping is missing and convention-based defaults cannot resolve that identity (for example, a service has no domain), strict mode (`allow-unmapped: false`) fails with a clear error. Lenient mode (`allow-unmapped: true`) skips the unmapped item and records it in the stage's unmapped-items summary (see §3.4.2).

Phase 13 intentionally keeps EventCatalog integration narrow. It maps only the obvious internal concepts needed by the demo (`Domain` → domain, `Service` → `UseCase`, `Event` → `Event`, consumer relationships → `EventHandler`). External participants, out-of-repo systems, and richer EventCatalog semantics are treated as unmapped in this phase.

**Schema — `eventcatalog-import.yaml` and `eventcatalog-mappings.yaml` both validated by JSON Schema.** Both schemas live in `riviere-extract-config` alongside the workflow and extraction-config schemas. All §2.6 rules apply: every string field has `minLength: 1`, `type` is an enum of `ComponentType` values (reused from `riviere-schema`), `allow-unmapped` is a required boolean, `domains` / `services` / `events` sections are optional objects keyed by EventCatalog names, and unknown top-level keys are rejected (`additionalProperties: false`). `RiviereProjectRepository` parses and validates both files before constructing the typed stage — typos and shape errors fail before `workflow run` starts.

#### `asyncapi-import`

Imports components and connections from an AsyncAPI spec. `RiviereProject` depends on an explicit AsyncAPI document-loading port. A use-case adapter implements that port over a generic client backed by `@asyncapi/parser`; only the generic client imports the parser. The Project owns the supported-v3 scope, mapping, graph mutation, and diagnostics decisions.

```yaml
- name: import-broker
  kind: asyncapi-import
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
| `servers`                                         | **Dropped.** Broker infrastructure, not component flow. The stage does not fail on its presence.                                                           |
| `channels`                                        | Read to resolve message payloads and parameters; not synthesised as components (channels are infrastructure, not flow nodes).                              |
| `channels.*.parameters`                           | **Dropped** in Phase 13. Dynamic topic parameters are deferred.                                                                                            |
| `channels.*.bindings`                             | **Dropped** in Phase 13. Broker-specific bindings are noise for flow extraction.                                                                           |
| `operations` with `action: send`                  | Consumed — resolved to a canonical publisher component via mappings; async link added from publisher → event.                                              |
| `operations` with `action: receive`               | Consumed — resolved to a canonical EventHandler via mappings; async link added from event → handler.                                                       |
| `operations.*.reply`                              | **Fails validation** with `asyncapi request/reply pattern not supported in Phase 13 (operation: '<id>')`. Strict behaviour regardless of `allow-unmapped`. |
| `operations.*.traits`                             | **Dropped.** Operation-level trait composition is applied by the parser before the Project receives the document; no extra handling.                       |
| `messages`                                        | Consumed — resolved to canonical Event components via mappings.                                                                                            |
| `messages.*.payload`                              | Consumed as metadata on the Event component (schema reference preserved; full payload schema is not inlined into the graph).                               |
| `messages.*.headers`, `messages.*.bindings`       | **Dropped** in Phase 13.                                                                                                                                   |
| `components.*` (reusable schemas, messages, etc.) | Resolved by `@asyncapi/parser` before the Project receives the document; no special handling required.                                                     |
| `security`, `tags`, `externalDocs`                | **Dropped** in Phase 13.                                                                                                                                   |

Any other AsyncAPI v3 field not listed above is dropped silently; the stage never fails for an unrecognised top-level key. The list above is exhaustive for Phase 13; future phases may promote dropped items to consumed and must update it.

**Schema — `asyncapi-import.yaml` and `asyncapi-mappings.yaml` both validated by JSON Schema.** Both schemas live in `riviere-extract-config`. Same §2.6 rules as EventCatalog: `minLength: 1` on every string field, `type` from the `ComponentType` enum, `allow-unmapped` required boolean, `messages` / `operations` optional objects keyed by AsyncAPI names, `additionalProperties: false`. `RiviereProjectRepository` validates both files before constructing the typed stage.

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
  - ../orders/src
  - ../shipping/src

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

**Bound-limit overflow behaviour:** If the files matched by `sources` + `context.exclude` exceed `max-files-per-batch * max-batches`, the stage does **not** silently truncate. It fails with: `ai-extract: source scope produced N files, exceeds bound (max-files-per-batch * max-batches = M). Narrow 'sources' or raise the bounds explicitly.`

**Gap category computation (precise definitions):**

Each value in `selection.from` maps to a concrete gap set computed from builder state (via §3.5.1 read surface) plus the configured source directories:

| Gap category             | How the Project computes the gap set                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `uncertain-links`        | The active Workflow's unresolved `uncertain-link` diagnostics emitted by earlier deterministic stages. Each unresolved diagnostic is a candidate for AI re-resolution.                                             |
| `missing-events`         | The Project scans configured sources for event-publishing call sites, maps each to a `(domain, module, name)` candidate, and filters out canonical IDs already present in the Builder's readonly component values. |
| `missing-event-handlers` | For each `Event` in the Builder's readonly component values with no inbound Link from an `EventHandler`, the Project scans sources for plausible handler call sites targeting that event name.                     |
| `missing-use-cases`      | The Project scans sources for use-case-shaped call sites and filters out canonical IDs already present as `UseCase` components in the Builder's readonly values.                                                   |

Any future gap category is added as a new enum value with its computation rule documented here. The stage never does free-form "find anything interesting"; each category is a discrete, reviewable computation.

**Additive-only contract (see §3.5):** `ai-extract` always calls `upsert*` with `{ noOverwrite: true }`. Under this flag, a collision with an existing component returns `{ created: false }` with scalars untouched; the Workflow records "candidate already present" and moves on. New internal Links preserve source-occurrence identity and are added only when that exact occurrence is absent. There is no separate AI-only facade.

**Enums over strings:** `selection.from` is an enum of supported gap categories. `selection.component-types` is an enum of supported Riviere component types.

**AI runtime boundary:** `RiviereProject` invokes its AI CLI port with the typed stage request. A use-case adapter implements that port over a generic `child_process.spawn` client. Riviere does not manage API keys, tokens, cost, rate limits, or retries. `workflow validate` resolves each configured AI command; `workflow run` resolves commands only for AI stages that will invoke the CLI. Response JSON is validated against a strict schema published in `riviere-extract-config` before the adapter returns it to the Project.

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
  - ../orders/src
  - ../shipping/src

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

**Additive-only contract (see §3.5):** `ai-enrich` calls the typed `upsert*` method matching the target component's type with `{ noOverwrite: true }`, supplying only fields it may fill. Any scalar set by an earlier stage is preserved; only `undefined` / `null` fields receive the AI-proposed value.

**Enums over strings:** `selection.component-types` is an enum of supported component types. `fields` is an enum of allowed enrichable fields.

**AI runtime boundary:** Same model as `ai-extract`: the Project invokes its AI CLI port with the configured executable and arguments, and a use-case adapter delegates the process interaction to the generic client. See §3.4.1.

#### `schema-validate`

Validates the graph by calling `builder.validate()` (the non-throwing validation entry point, see §3.5.1). Reports validation errors. Validation is always strict — no lenient mode.

```yaml
- name: validate
  kind: schema-validate
```

**Why `validate()` not `build()`:** `schema-validate` is an **intermediate** checkpoint. Calling `build()` mid-workflow would throw on incomplete state that a later stage could complete. `validate()` returns a `ValidationResult`; the Project combines it with Workflow diagnostics and returns a typed stage failure without mutation when invalid.

On failure: logs validation errors from `ValidationResult.errors` and the workflow exits with code 1.

**Value vs final `build()`:** `schema-validate` is an optional explicit checkpoint. Inserting it between code extraction and spec imports catches malformed state before expensive AI stages run. Final output always calls `builder.build()` after the Workflow's diagnostic check, even when the checkpoint stage is omitted.

#### 3.4.1 AI Runtime — Shell out to a User-Configured CLI

Phase 13 ships the **absolute minimum possible AI surface**. Riviere does **not** depend on an AI SDK or manage API keys, tokens, cost, rate limits, retries, or prompt caching. AI stages invoke a user-configured CLI such as `claude`, `codex`, or `ollama` through the Project port and parse structured JSON from stdout.

**How it works (the whole mechanism):**

1. The Project's AI stage operation builds a prompt from readonly Builder values, current unresolved Workflow diagnostics, relevant source snippets, the stage-kind-specific prompt template, optional AI memory, and optional `prompt-append` content.
2. The Project invokes its AI CLI port with the typed request; the use-case adapter supplies the prompt through stdin (preferred) or one argument placeholder to the generic process client.
3. The generic process client captures bounded stdout/stderr and enforces the timeout.
4. The adapter validates stdout against the strict response schema for that stage kind in `riviere-extract-config` and returns a typed result.
5. The Project applies the typed response through `upsert*` with `{ noOverwrite: true }` and preserves Link occurrence identity.

**Configuration (in the stage config, not global):**

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
  - ../orders/src
  - ../shipping/src
selection:
  ...
```

- `command` is a required string naming the executable to invoke.
- `args` is an optional explicit argv array. The AI CLI adapter executes `[command, ...args]` through its generic process client with `shell: false`. If `args` contains `{prompt}` exactly once, the prompt is substituted into that argv slot; otherwise the prompt is piped via stdin.
- `timeout-seconds` is a required integer (`minimum: 1`). Exceeding it kills the child process and fails the stage.
- `memory` is an optional path to a user-authored text/Markdown file containing repo-specific learnings, known false positives, naming conventions, and intentional absences.
- `prompt-append` is an optional path to a text/Markdown file appended after the built-in prompt template. It gives users controlled prompt flexibility without allowing full prompt replacement.
- Memory-derived suppressions are applied during prompt construction where possible and again before AI results are applied to the builder.
- **No env vars, no API keys, no provider config in YAML.** Authentication is whatever the CLI binary itself requires — `claude` has its own auth, `codex` has its own, `ollama` has none. Riviere never sees or touches credentials.
- **Process/env policy:** the generic process client inherits the current process environment as-is, does not load `.env`, does not mutate env vars, and does not copy raw stdout/stderr into structured workflow logs except bounded failure context needed for debugging.

**What `workflow validate` checks for each typed AI stage:**

- `command` resolves in `PATH`. If it does not: `workflow validate` fails with `Stage '<name>' (<kind>) requires the '<command>' CLI, but it is not installed or not in PATH`.
- `args` parses correctly (at most one `{prompt}` placeholder).
- `memory` / `prompt-append` paths exist when configured.

The Project performs executable availability checks through the same constructor-injected `AiCli` domain port whose `run(...)` operation executes AI stages. One adapter implements both operations over one generic child-process client. Validation never invokes `run(...)` merely to discover availability.

**What Riviere does NOT build:**

- API-key loading, keychain integration, dotenv parsing.
- Token counting, cost estimation, budget caps.
- Rate limiting, exponential backoff, retries, circuit breakers.
- Prompt caching, response caching, replay.
- Model selection, reasoning mode, temperature controls — whatever the user wants is expressed in the configured executable + args (e.g. `command: claude`, `args: ['--model', 'claude-opus-4-6', '-p']`).

All of the above is the CLI binary's problem. If the CLI already provides it, great. If not, it's still not Riviere's problem.

**`--dry-run` flag on `workflow run`:** for every active AI stage, the Workflow returns the prompt event and skips invocation/application. The CLI prints the returned prompt. AI executable checks are skipped because no process is spawned. Deterministic stages execute normally.

**`--skip-ai` flag on `workflow run`:** removes AI stages from the effective execution plan after the complete Project and typed Workflow have loaded (no prompt construction, child process, or AI executable-prerequisite check). AI config files still exist and validate because they are part of the aggregate definition. Output is deterministic-only. This is how CI runs the deterministic-path idempotency test (criterion #13a) without requiring an AI CLI.

**Response schema (strict, per AI stage kind):** each AI stage kind has a JSON Schema in `riviere-extract-config` defining the CLI stdout. Malformed JSON, schema violations, or unrequested fields fail the stage. The §2.6 strictness rules apply, and schemas are published for prompt authors.

**Why this design:**

- Zero coupling to any specific AI provider.
- Zero auth/secret surface in Riviere.
- Works on day one with any CLI the user already has.
- A different CLI is selected by editing the stage config, without a Riviere release.

#### 3.4.2 Unmapped-Items Diagnostics (lenient import stages)

When `eventcatalog-import` or `asyncapi-import` runs with `allow-unmapped: true`, skipped items are emitted as structured events into the workflow's NDJSON diagnostic log (§3.9) rather than lost in a stream of warning lines.

**Behaviour:**

- Each skip records the source-system record identifier, a reason from the stage-kind-owned enum, and source location when known.
- At stage completion, the Workflow records summary values such as `imported: 180, skipped: 20`; the CLI renders the documented summary line.
- Strict mode (`allow-unmapped: false`) does not record a skip summary; a skip is a stage failure.

**Representative NDJSON event:**

```json
{
  "runId": "2026-04-14T12:34:56Z#ecommerce-architecture",
  "timestamp": "2026-04-14T12:34:56Z",
  "type": "ImportSkippedRecord",
  "stageName": "import-eventcatalog",
  "stageKind": "eventcatalog-import",
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

`RiviereBuilder` supports multi-source graph construction. When a stage upserts a component that already exists at the same ID, the Builder merges it rather than throwing `DuplicateComponentError`.

This is a builder-level capability, not workflow-specific. Multi-source graph construction is a core use case.

**Identity rule:** Upsert is merge-after-identity, not identity resolution. Cross-source identity is normalized by typed stage mappings/config and Project behaviour before the Builder sees the component.

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

**Precedence rule (last-wins):** For scalar conflicts on the same canonical component, the later stage overwrites the earlier one. Teams order Workflows per §2.2 so higher-priority sources run later. AI stages are **additive-only** and never participate in scalar overwrite.

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

There is **no generic `upsertComponent(ComponentInput)`**. Each Project stage operation calls the method matching the component type it produces. Mapping configs, extraction pipelines, and import conventions resolve the type before Builder invocation, preserving explicit narrow APIs and type-specific validation.

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

**Schema-enforced strictness — empty strings are banned everywhere:** All string fields on Riviere component inputs, Link inputs, stage configs, mapping files, and Workflow files **must have `minLength: 1`** (or equivalent) at the schema boundary. Empty strings are rejected before domain behaviour; merge logic sees real values or `undefined`/`null`, never `""`.

- **If a user wants a field unset**, they omit it from the YAML. They do not set it to `""`.
- **If a user supplies `""` on a required string**, schema validation fails before any stage executes.
- **No code in the merge path handles empty-string-as-unset.** Handling it downstream would hide the input error, invite silent data loss, and violate the "prevent workarounds at the boundary" principle.

**Additive-only contract for AI stages:** the corresponding `RiviereProject` operations must call `upsert*` with `{ noOverwrite: true }`. This is enforced by the Project's exhaustively matched stage behaviour, not by a separate API surface:

- `ai-extract` passes `noOverwrite: true`. If the component already exists (`created: false`), the Workflow records a collision-with-prior-source event and skips further mutation for that component.
- `ai-enrich` passes `noOverwrite: true` for every upsert call. Fields already set by deterministic stages are preserved; only `undefined` / `null` fields receive the AI-proposed value.

`noOverwrite` is one option on the seven typed upsert methods; it does not introduce a parallel method set or facade. AI stage operations always use it.

**Link occurrence identity:** Internal Links preserve distinct source occurrences. `link()` identifies an occurrence by source component, target component, and source location. A repeated occurrence fails with `DuplicateLinkError`; two occurrences with the same endpoints but different source locations remain separate Links. Phase 13 must not collapse internal Links to an endpoint tuple. `linkExternal()` has no source-location occurrence and therefore deduplicates by `(source, target.repository, target.name, type)`, returning a scoped `DUPLICATE_LINK_SKIPPED` operation warning when it preserves an existing external Link.

**`addDomain()` and `addSource()` become idempotent:** Adding a domain/source that already exists is a no-op. No error. Source identity = `repository`. Domain identity = domain name.

#### 3.5.1 Builder Read Surface

Phase 13 does **not** introduce a workflow Builder facade or import `RiviereQuery` into the mutable Builder package. The Project and Workflow use the published `RiviereBuilder` surface directly:

| Method                                 | Purpose                                                                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `builder.components()`                 | Readonly current component values for Project-owned gap and enrichment decisions.                                                 |
| `builder.links()`                      | Readonly current internal Link occurrences, including source locations.                                                           |
| `builder.externalLinks()`              | Readonly current external Links.                                                                                                  |
| `builder.validate(): ValidationResult` | Non-mutating graph validation. The Workflow separately checks unresolved Workflow diagnostics before accepting a run.             |
| scoped mutation result `.warnings`     | Warnings caused by that exact upsert or external-link operation; the Workflow attributes them to the active stage without deltas. |
| `builder.warnings()`                   | Whole-graph diagnostics only; not the source of operation attribution.                                                            |
| `builder.build(): RiviereGraph`        | Builder finalisation after the Workflow has confirmed that no unresolved Workflow diagnostics remain.                             |

These methods expose immutable published values, not mutable Builder internals and not a valid completed `RiviereGraph`. The Project derives `componentsByType`, published-event, inbound-Link, statistics, and orphan views from these values as its stage behaviour requires. `RiviereQuery` remains a completed-graph read model and does not gain draft-only helpers or become a dependency of `riviere-builder` published language.

#### 3.5.2 Workflow-Only Incomplete-State Diagnostics

Today `_missing` lives on `EnrichedComponent` (extract-ts) and `_uncertain` on `ExtractedLink` (extract-ts). In Phase 13 these remain **draft-only extractor markers** and do **not** become valid `riviere-schema` fields.

- **`riviere-schema` remains unchanged** — `_missing` / `_uncertain` are not added to `Component` or `Link`.
- **Workflow boundary:** when `code-extraction` runs in lenient mode, draft markers are converted into structured Workflow diagnostics keyed by canonical component identity / Link occurrence.
- **Diagnostics view:** unresolved `missing-field` / `uncertain-link` values are available to later Project stage operations through the active Workflow context and are returned as Workflow events for the CLI log (§3.9).
- **Canonical keys:** `missing-field` diagnostics key on `(componentId, field)`; `uncertain-link` diagnostics key on the Link occurrence identity `(source, target, sourceLocation)`. These keys are stable across stages and log events.
- **Resolution ownership:** the Workflow diagnostics store is the resolver. After a successful direct Builder upsert or Link addition, the Workflow resolves matching diagnostics only when the corresponding field or Link occurrence was newly applied. Skipped writes under `{ noOverwrite: true }` do **not** resolve diagnostics. Exceptional domain resolutions remain explicit Workflow operations; adapters and the CLI never resolve diagnostics.
- **Resolution logging:** every auto-resolution or explicit resolution records a `DiagnosticResolved` Workflow event keyed to the same canonical diagnostic so log-parsing commands can reconstruct current unresolved state.
- **Validation/build:** the Workflow combines `builder.validate()` with unresolved incomplete-state diagnostics before accepting a validation stage or final graph. `builder.build()` remains Builder finalisation and is called only after that Workflow-owned check succeeds.

Result: AI stages can operate on draft/in-progress graph values while the final `RiviereGraph` remains clean and schema-valid. The underlying `RiviereBuilder` stays graph-only; the Workflow coordinates its direct Builder calls with its diagnostics state without introducing an adapter layer.

Standalone `riviere extract` preserves current draft-output semantics. Only Workflow execution converts draft missing/uncertain state into Workflow diagnostics.

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

Interactive setup that builds the Workflow definition and stage configs for a **greenfield** repository. It guides the user through:

1. What codebases to extract from → creates `code-extraction` stages and scaffolded extraction configs
2. What external specs exist → creates import stages and mapping-config templates
3. Whether to include AI stages → adds `ai-extract` / `ai-enrich` stages
4. Whether to include a validation stage

Outputs the workflow YAML file and all referenced config/mapping files.

`InitializeWorkflow` is the `command-use-case` that owns existing-config policy, the no-write decision, template generation, and persistence orchestration. It depends on injected generic filesystem client operations for file discovery and atomic multi-file writes. The CLI entrypoint only collects interactive answers, calls `InitializeWorkflow.execute({ targetDirectory, ...answers })`, and presents the typed result. Generic filesystem clients know paths and bytes but do not know migration policy or Workflow semantics. No aggregate, repository loading method, or CLI-entrypoint filesystem orchestration is added for initialization.

**Greenfield-only policy — refuse to run if existing extraction configs are detected.** Before writing any files, `init` walks the target directory for known extraction-config files (`riviere-config.yaml|yml`, `extraction.config.json|yaml|yml`, including `.riviere/config/`). If any are found:

- Print the list of detected configs with absolute paths.
- Print the error: `existing extraction configs detected; workflow init is greenfield-only.`
- Print a ready-to-copy AI-assistant prompt instructing the assistant to inspect the detected configs, draft a `riviere-workflow.yaml` that preserves them, call out behavioural differences from existing `riviere extract` usage, list unresolved questions, and make no edits until the plan is reviewed.
- Exit with non-zero code **without creating any files**.

If any generated target already exists or an atomic write fails, initialization likewise leaves no partial generated file set behind.

Rationale: Phase 13 does not ship an automated migration tool. Automatic detect-and-wire risks producing a workflow that subtly differs from the user's current extract invocation (paths, working directory, inherited CLI flags). The AI-assistant prompt is a guided drafting aid, not an automatic converter. A short migration guide (`docs/workflow/migrating-from-extract.md`) is part of Phase 13 documentation scope — see success criterion #30.

`riviere workflow init` is distinct from `riviere extract`. `extract` is for single-codebase extraction (Phase 10-12 direct usage). `workflow run` is for multi-source orchestration (Phase 13). They are separate commands — `extract` does not accept a `--workflow` flag.

**Upgrade path for existing `extract` users (documented, not automated):**

1. Keep the existing extraction config(s) unchanged.
2. Create `riviere-workflow.yaml` manually with workflow-level `name`, `description`, `output`, `sources`, `domains`.
3. Add a single `code-extraction` stage with `config: ./<path-to-existing-extraction-config>`.
4. Run `riviere workflow validate` to confirm the compatibility rules in §3.3 pass (workflow `sources` / `domains` must be compatible with the extraction config's declarations).
5. Run `riviere workflow run` to produce the equivalent output graph.

The workflow run and the prior `riviere extract` invocation must produce the same component IDs and full Link occurrence identities against the same config (the parity guarantee from §3.4 "Required extraction refactor" + success criterion #25).

#### `riviere workflow run`

Executes the workflow:

1. Load and parse YAML; assert `apiVersion: v1`
2. Validate workflow structure against JSON Schema (intrinsic workflow shape only)
3. Load and validate every referenced config, narrow every stage variant, and construct the complete `RiviereProject`
4. Ask the selected Workflow to derive the effective execution plan (`--skip-ai`, `--dry-run`)
5. Resolve runtime prerequisites only for active stages that will invoke an external capability
6. Invoke one Project rebuild operation; the Workflow executes its active stages sequentially against the Project's fresh private Builder
7. On success: write the returned graph atomically to `output`, replacing any prior graph only after the write completes
8. On failure: write the returned Workflow events to the structured log, preserve any prior graph at `output`, report the failed stage and reason, and exit code 1

**Flags:**

- `--dry-run` — executes deterministic stages normally; for every active AI stage, returns and prints the would-be prompt while skipping invocation/application. AI executable checks are skipped because no invocation occurs.
- `--skip-ai` — skips AI stages after the complete typed Project loads (no prompt construction, CLI invocation, or AI executable-prerequisite check). AI config files remain required and validated as part of the Workflow definition. Output is deterministic-only. This is how the deterministic-idempotency test (§3.8.3, criterion #13a) runs in CI without any AI CLI present.

**Error handling:** If a stage fails, the Workflow aborts. There is no retry, skip, or partial graph replacement. Aggregate Builder state rolls back, any prior output graph remains unchanged, and the structured log remains available.

**Distinction between error types:**

- **Config errors** (missing file, invalid YAML, schema violation): always fail, regardless of lenient mode
- **Extraction strictness** (`allow-incomplete`): controls whether unresolvable types produce errors or unresolved diagnostics within a `code-extraction` stage. It does not affect Workflow abort semantics.
- **AI CLI failures** (non-zero exit, timeout, malformed JSON, or response-schema violation): fail the owning AI stage; the Workflow aborts.

**Stage summary output:** The Workflow returns a completion event with duration and outcome values for each stage. The CLI prints the multi-line summary in §3.9.3.

#### `riviere workflow validate`

Three validation levels, all running in fail-fast order:

1. **Structural:** YAML parses, required fields present, all referenced config/mapping files exist on disk.
2. **Semantic:** `RiviereProjectRepository` validates and narrows each referenced config (extraction schemas, mapping files, AI enums/limits), then the Project validates stage-declared domains and sources against the Workflow definition.
3. **Runtime-prerequisite availability:** The validator exhaustively identifies prerequisites from the typed stage variant. For `ai-extract` and `ai-enrich`, it resolves the stage config's `command` executable against `PATH`; if it does not resolve, validation fails with a clear per-stage message (`Stage '<name>' (<kind>) requires the '<command>' CLI, but it is not installed or not in PATH`). No env-var probing, no API-key checks; Riviere never touches credentials. See §3.2 and §3.4.1 for the contract.

Does not execute stages. It fails fast at the first validation level with errors. Exit code is non-zero on failure, and the message names the level and offending stage.

### 3.7 Architecture Fit

Phase 13 extends the existing `RiviereProject` aggregate boundary. It does not add a separate workflow package or runtime owner.

```text
riviere-cli
  -> riviere-extract-ts use cases

riviere-extract-ts domain model
  -> riviere-builder published language
  -> riviere-extract-config
  -> riviere-schema

riviere-extract-ts use cases
  -> riviere-extract-ts domain model
  -> external clients for EventCatalog, AsyncAPI, AI CLI, files and executable lookup
```

**Responsibilities:**

- `riviere-cli` — CLI entrypoints (`workflow run`, `workflow init`, `workflow validate`)
- `riviere-extract-ts` domain model — `RiviereProject`, owned `Workflow` entities, typed `WorkflowStage` values, stage progression, graph application, diagnostics, and domain mapping decisions
- `riviere-extract-ts` use cases — commands, full aggregate loading, domain-port adapters, and isolated generic clients for EventCatalog, AsyncAPI, AI CLI, files, and executable lookup
- `riviere-builder` — graph construction, idempotent `addSource()` / `addDomain()`, and the seven typed `upsert*` methods with `{ noOverwrite }`
- `riviere-extract-config` — Workflow and stage config schemas/types, mapping schemas, AI response schemas

**Extension direction:** Phase 13 intentionally uses a closed built-in stage union. Future plugin loading is a separate product and architecture decision; Phase 13 does not weaken exhaustive type safety in anticipation of it.

**Repository hygiene requirements:**

- **Folder structure** follows ADR-002: domain concepts under `packages/riviere-extract-ts/domain-model/src/domain`, commands/data access/adapters under `packages/riviere-extract-ts/use-cases/src/features/extract`, generic technical clients under that use-case package's `src/infra/external-clients`, and CLI protocol handling under `apps/cli/src/features/workflow/entrypoint`.
- **Role enforcement:** every exported declaration uses an existing honest role. `RiviereProject` remains the approved aggregate, `Workflow` remains an `aggregate-entity`, and `WorkflowStage` remains a `value-object`. No `workflow-runtime`, `step-handler`, `step-registry`, generic orchestrator, or other new escape-hatch role is introduced.
- **Aggregate-repository loading methods:** public methods that load and return an aggregate are named `load` or `loadBy<AccessCriterion>`. Role enforcement rejects other loading names without imposing that pattern on optional persistence methods or private helpers; documentation and review require the suffix to name a real lookup criterion.
- **Adapter isolation:** only generic external clients import `@eventcatalog/sdk`, `@asyncapi/parser`, or Node `child_process`; domain adapters implement explicit ports and contain no domain decisions.
- **Coverage:** 100% test coverage remains mandatory.
- **Cross-package imports:** use published package names and workspace references; never relative paths across package boundaries or imports from another subdomain's private domain model.

### 3.7.1 Milestones

Phase 13 is ordered into six milestones. Static demo source/spec groundwork may proceed in parallel with M1. Executable workflow fixtures and their pinned-SHA gate land only after the required M1-M4 capabilities exist. The authoritative planning contract lives in §7; this table is the quick milestone map.

| Milestone | Name                          | Scope                                                                                                                                                                                                                                                                                                                                 | Claims success criteria                                   |
| --------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| M0        | Demo App Groundwork           | Lands in `ecommerce-demo-app`: preserve the existing deterministic baseline; add deliberate-gap documentation, EventCatalog/AsyncAPI sources, mappings, and capability spikes early; add executable workflow configs, ground truth, transition fixtures, README journey, and the pinned-SHA contract after M1-M4.                     | Precondition for §3.8 criteria; no direct criterion claim |
| M1        | Project Workflow + Builder    | First enforce aggregate-repository loading-method names, then extend the existing Project/Workflow/Stage model, shared Builder, workflow JSON Schema in `riviere-extract-config`, residual `upsert*`/warning behaviour, workflow-only incomplete-state diagnostics, and extraction parity (§3.4). No second runtime package or owner. | #1, #2, #5, #11, #12, #20, #21, #24, #25, #26, #46, #49   |
| M2        | Built-in Deterministic Stages | Project operations for `code-extraction`, `eventcatalog-import`, `asyncapi-import`, and `schema-validate`; mapping-file schemas; compatibility-rule validation.                                                                                                                                                                       | #3, #4, #15, #16, #23, #47                                |
| M3        | AI Stages                     | Project operations for `ai-extract` and `ai-enrich`; shell-out through the AI CLI port per §3.4.1; response JSON schemas in `riviere-extract-config`; gap-category computation; `--dry-run` and `--skip-ai` run modes. **Scope note:** no SDK dependency, credential surface, or retry/rate-limit design.                             | #6, #7, #14, #22, #33, #48                                |
| M4        | CLI Commands                  | `riviere workflow run` (with `--dry-run` and `--skip-ai`), `workflow init`, and `workflow validate`; stage summary output; atomic graph replacement; greenfield-only init with existing-config refusal and migration prompt.                                                                                                          | #9, #10, #17, #30, #34                                    |
| M5        | End-to-End Demo Verification  | Phase 13 CI pulls `ecommerce-demo-app` at a pinned SHA, runs the complete Workflow, and verifies ground truth and transition fixtures. Idempotency verification runs the deterministic-only variant with AI stages skipped per #13a; #13b is deferred.                                                                                | #8, #13a, #18, #19                                        |

**M0 readiness checklist (augments the existing repo; these are checks R0.1-R0.10, not separately planned deliverables):**

- R0.1 The five existing domain codebases (`orders-domain/`, `shipping-domain/`, `inventory-domain/`, `payment-domain/`, `notifications-domain/`) plus `bff/` and `ui/` continue to build cleanly and `verify-extraction.mjs` continues to pass against the existing `expected-extraction-output.json` / `expected-connections.json`. **Existing extraction artifacts are not modified.**
- R0.2 A named list of deliberate extraction gaps is documented in a new "Phase 13 Workflow" section of the existing README, each gap mapped to the source location and the expected AI-discovery outcome.
- R0.3 New EventCatalog source under `specs/eventcatalog/` is valid and covers cross-domain event flows across all five domains. A capability test loads it through `@eventcatalog/sdk` and yields every relationship Phase 13 consumes before D2.1 starts.
- R0.4 New `specs/asyncapi.yaml` validates through `@asyncapi/parser` and covers publish/subscribe only.
- R0.5 New mapping files (`specs/eventcatalog-mappings.yaml`, `specs/asyncapi-mappings.yaml`) normalise to canonical Riviere identity across all five domains and pass schema tests.
- R0.6 After M1-M4, the root workflow references the existing extraction config through a `code-extraction` stage and `workflow validate` passes.
- R0.7 Workflow ground truth covers deterministic, spec-derived, and AI-discovered additions; its fixture strategy is documented in the demo-app change.
- R0.8 Transition fixtures exist for every completed stage and are generated through the documented result-serialization procedure (§3.8.3), never edited by hand.
- R0.9 The existing README's deterministic setup guidance is preserved, and a Phase 13 Workflow section describes the orchestrated journey as its next step.
- R0.10 `living-architecture` CI pins the approved demo-app commit SHA and documents coordinated schema/behaviour updates.

### 3.8 Demo App Validation

Every capability is validated against `ecommerce-demo-app`, **an existing separate repository** at `NTCoding/ecommerce-demo-app`. The demo app is already a working multi-domain codebase with deterministic extraction wired up; Phase 13 augments it with Workflow YAML, EventCatalog/AsyncAPI specs, mapping files, AI stage configs, and transition fixtures.

Project/workflow code in `living-architecture` never contains demo-app source or fixtures. The inter-repo contract is part of this PRD's scope and must be explicit before M2 can claim any §3.8 success criterion.

**Repository split (inter-repo contract):**

| Repository            | Owns                                                                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `living-architecture` | The Project-owned Workflow and stage behaviour, ports/adapters/clients, CLI, schemas, and this PRD. No demo-app source or fixtures.                                                                                                                                                  |
| `ecommerce-demo-app`  | The demo codebase (already 5 domains + BFF + UI), EventCatalog instance, AsyncAPI v3 spec, mapping files, Workflow YAML, stage configs, ground-truth fixtures, and transition fixtures. Phase 13 adds Workflow-specific artifacts; deterministic extraction artifacts already exist. |

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

**Phase 13 additions to `ecommerce-demo-app` (delivered through D0.2-D0.4):**

| #   | Addition                                                             | Status before Phase 13                                               | Phase 13 deliverable                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `riviere-workflow.yaml`                                              | Does not exist                                                       | New file at repo root; references existing `.riviere/config/extraction.config.json` via a single `code-extraction` stage. The JSON config remains authoritative; Phase 13 does not migrate it to YAML. |
| 2   | `specs/eventcatalog/`                                                | Does not exist                                                       | New EventCatalog instance covering the cross-domain event flows (orders → shipping, payment, inventory, notifications). The EventCatalog SDK capability check (R0.3) lands here.                       |
| 3   | `specs/asyncapi.yaml`                                                | Does not exist                                                       | New AsyncAPI v3 spec covering the broker channels and operations for the same flows.                                                                                                                   |
| 4   | `specs/eventcatalog-import.yaml`, `specs/eventcatalog-mappings.yaml` | Does not exist                                                       | New stage config and mappings file.                                                                                                                                                                    |
| 5   | `specs/asyncapi-import.yaml`, `specs/asyncapi-mappings.yaml`         | Does not exist                                                       | New stage config and mappings file.                                                                                                                                                                    |
| 6   | `stages/ai-extract.yaml`, `stages/ai-enrich.yaml`                    | Does not exist                                                       | New AI stage configs with structured `command` and `args` per §3.4.1.                                                                                                                                  |
| 7   | `tests/workflow-transitions/NN-after-<stage>.json`                   | Does not exist                                                       | New per-stage fixtures generated from `WorkflowRunResult.transitions` through the documented procedure (§3.8.3).                                                                                       |
| 8   | `tests/workflow-ground-truth.json`                                   | Does not exist                                                       | New full-Workflow fixture. Existing direct-extraction fixtures remain unchanged and continue to serve their current verification scripts.                                                              |
| 9   | Documented deliberate extraction gaps                                | Implicit in the existing code                                        | Phase 13 PR enumerates the gaps in the README's "Phase 13 Workflow" section, mapping each gap to its expected AI-discovery outcome.                                                                    |
| 10  | README "Phase 13 Workflow" section                                   | README documents the 6-step pre-Phase-13 extraction workflow concept | Phase 13 adds a new section showing the orchestrated workflow run end-to-end. Existing README content is preserved.                                                                                    |

**What Phase 13 does NOT change in `ecommerce-demo-app`:**

- The five domain codebases, BFF, UI, and their existing source code.
- `.riviere/config/extraction.config.json` and the seven per-component JSON configs remain authoritative and are referenced as-is by one `code-extraction` stage.
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

stages:
  - name: extract-code
    kind: code-extraction
    # The existing top-level extraction config $refs all seven per-component configs;
    # one Workflow stage covers every domain + bff + ui without re-listing them here.
    config: ./.riviere/config/extraction.config.json

  - name: import-eventcatalog
    kind: eventcatalog-import
    config: ./specs/eventcatalog-import.yaml

  - name: import-asyncapi
    kind: asyncapi-import
    config: ./specs/asyncapi-import.yaml

  - name: discover-gaps
    kind: ai-extract
    config: ./stages/ai-extract.yaml

  - name: enrich-metadata
    kind: ai-enrich
    config: ./stages/ai-enrich.yaml

  - name: validate
    kind: schema-validate
```

The `code-extraction` stage references the existing `extraction.config.json` directly. Phase 13 does **not** migrate the demo app's JSON extraction configs to YAML; existing files continue to drive `verify-extraction.mjs` independently.

This workflow is the reference ordering for Phase 13 (last-wins, highest-priority-last):

- code first so deterministic extraction seeds the graph with the full set of code-discovered components and links
- spec imports second so spec-owned scalar values overwrite any code-derived values on the same components (specs are the authoritative source of truth for what they cover)
- AI last so it only adds missing components/links and fills strictly-unset scalar fields without competing with deterministic sources

**Representative demo inputs:**

```yaml
# specs/eventcatalog-import.yaml
source: ./eventcatalog
mappings: ./eventcatalog-mappings.yaml
allow-unmapped: false
```

```yaml
# specs/asyncapi-import.yaml
source: ./asyncapi.yaml
mappings: ./asyncapi-mappings.yaml
allow-unmapped: false
```

```yaml
# stages/ai-extract.yaml
command: claude
args: ['-p']
timeout-seconds: 600
memory: ./ai-memory.md
prompt-append: ./ai-extract.instructions.md

sources:
  - ../orders-domain/src
  - ../shipping-domain/src
  - ../inventory-domain/src
  - ../payment-domain/src
  - ../notifications-domain/src
  - ../bff/src
  - ../ui/src

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
# stages/ai-enrich.yaml
command: claude
args: ['-p']
timeout-seconds: 600
memory: ./ai-memory.md
prompt-append: ./ai-enrich.instructions.md

sources:
  - ../orders-domain/src
  - ../shipping-domain/src
  - ../inventory-domain/src
  - ../payment-domain/src
  - ../notifications-domain/src
  - ../bff/src
  - ../ui/src

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

The demo Workflow must specify every stage so implementation and validation can compare actual behaviour with a known transition model.

##### Initial state before stage execution

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

##### Stage 1 — `extract-code`

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

##### Stage 2 — `import-eventcatalog`

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
- adding async Link occurrences from producers to events and events to handlers, preserving distinct source records/locations and avoiding only an exact existing occurrence

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

##### Stage 3 — `import-asyncapi`

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
- adding async Link occurrences where AsyncAPI describes message flow, preserving distinct operation/source locations and avoiding only an exact existing occurrence

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

##### Stage 4 — `discover-gaps`

Loads:

- `./stages/ai-extract.yaml`
- bounded source batches from every domain + bff + ui (per `sources` in the stage config)
- current readonly Builder component/Link values plus unresolved Workflow diagnostics (§3.5.1 / §3.5.2)

Reads:

- only files allowed by the AI extract config
- only gap categories listed in `selection.from`
- only unresolved incomplete-state diagnostics relevant to those gap categories

Modifies builder by:

- calling the typed `upsert*` method with `{ noOverwrite: true }` for each missing component returned by the CLI — creates new components; collisions with existing ones are logged and skipped (no scalar overwrite)
- adding missing Link occurrences returned by the CLI only when the exact occurrence is absent
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

##### Stage 5 — `enrich-metadata`

Loads:

- `./stages/ai-enrich.yaml`
- bounded source files near components with unresolved `missing-field` diagnostics or configured unset fields
- current readonly Builder component/Link values plus unresolved Workflow diagnostics (§3.5.1 / §3.5.2)

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

##### Stage 6 — `validate`

Loads:

- no extra config beyond the stage declaration

Reads:

- current builder state only

Modifies builder by:

- no graph mutation

Validation effect:

```text
builder.validate()
  -> returns ValidationResult (non-throwing)
  -> Project combines result with Workflow diagnostics and returns a stage failure if invalid
  -> leaves builder state unchanged
```

Final output write still calls `builder.build()` as the terminal operation; `schema-validate` only provides the early-failure signal.

##### Final output write

After all stages succeed, the CLI writes:

```text
./.riviere/ecommerce-architecture.json
```

The written graph must contain:

- spec-derived canonical events and async relationships
- code-derived components and internal links from both domains
- AI-discovered additions for the deliberate demo gaps
- AI-enriched metadata where allowed by config

This final artifact is compared against `tests/workflow-ground-truth.json` for exact component ID and full Link occurrence coverage.

#### 3.8.3 Demo App Validation Use

The ecommerce demo app must validate three things at once:

1. **Product realism** — a user can understand the Workflow YAML and stage configs as a believable first customer setup
2. **Execution correctness** — each stage changes Builder state in the expected direction and order
3. **Regression safety** — the full workflow remains idempotent and comparable to a fixed ground truth

To make stage progression testable, the demo app maintains per-stage transition fixtures. Each fixture captures exact expected Builder values after one stage completes and before the next begins. Implementation verifies:

- workflow startup builder creation
- each stage's additive or enriching effect on the graph
- that no later stage mutates earlier deterministic data outside the defined merge rules
- that `schema-validate` is non-mutating

**Fixture generation procedure (mandatory for R0.8):** Fixtures are generated from a known-good Workflow result. Demo tooling serialises the result's `initial` transition and each `stage-completed` transition to `tests/workflow-transitions/NN-after-<stage-name>.json`. The production result API returns the exact immutable accumulated component, Link, external-Link, and diagnostic values, so no test-only observer or private Builder access exists. Regenerating a fixture requires a known-good run (the author confirms the graph state is correct), then committing the generated JSON — never editing fixtures by hand.

**Exact-match assertion:** Integration tests comparing a live run's Builder values against a fixture use set-equality on component IDs and full Link occurrence identities, including source location when present. Targeted semantic assertions also check spec-overwrite fields, additive-only AI behaviour, and diagnostic-log output.

**Graph comparison semantics:**

- Fixtures serialise `WorkflowRunResult.transitions`; the Project produces each transition from `builder.components()`, `builder.links()`, `builder.externalLinks()`, and Workflow diagnostics after a completed stage. The published readonly Builder surface (§3.5.1) is authoritative.
- Components compared by ID (exact match on full set — no extra, no missing)
- Internal Links compared by full occurrence identity `(source, target, sourceLocation)` with relationship values asserted; external Links compared by their external connection identity
- Selected semantically important fields are asserted explicitly in dedicated integration tests (e.g. spec-owned descriptions, AsyncAPI-contributed fields, and fields AI enrichment is expected to fill)
- Structured workflow-log events are asserted explicitly in dedicated integration tests (for example scalar overwrites, duplicate external-Link skips, import skipped records, and AI additions/enrichments)

**Workflow idempotency — split by stage kind:**

- **Deterministic-only workflows** (no `ai-extract`, no `ai-enrich`): idempotency is **mandatory and CI-verified**. Running the same workflow twice against unchanged inputs must produce byte-equal output JSON under canonical serialisation. This is success criterion #13a, gated by CI.
- **Workflows with AI stages**: idempotency is **not in Phase 13 scope**. AI CLI invocations are non-deterministic unless the user's CLI provides pinned-runtime controls, which Phase 13 does not ship. The demo idempotency test uses `--skip-ai`; #13b is deferred with a manual procedure for teams that control their runtime.

### 3.9 Diagnostics

Failure diagnostics and cross-stage observability are first-class concerns. Workflows with multiple stages, spec sources, and AI involvement must return actionable diagnostics.

**Single diagnostic artefact:** every workflow run writes returned Workflow events as structured NDJSON to `<workflow-output-dir>/workflow.log.ndjson` where `<workflow-output-dir>` is the parent directory of the workflow `output` path. The CLI entrypoint creates the directory as needed. The final graph JSON is atomically replaced only after aggregate success. On failure, the new log remains available and any prior graph remains unchanged. Each run replaces the prior log for that workflow output location.

**Stable log envelope:** every NDJSON line is a returned `WorkflowRunEvent` and conforms to a discriminated-union schema in `riviere-extract-config` with fixed envelope fields (`runId`, `timestamp`, `type`, optional `stageName`, optional `stageKind`, `payload`). Event types use the published Workflow event union (for example `WorkflowStarted`, `StageStarted`, `ImportSkippedRecord`, `ScalarOverwrite`, `DiagnosticResolved`) rather than CLI-owned string aliases. Stage-specific event shapes extend `payload`.

**3.9.1 Stage-contextualised Builder errors.** Builder errors (`DuplicateComponentError`, `ComponentTypeMismatchError`, missing-referent errors, etc.) are raised inside `riviere-builder`. The Project catches them at the active stage-operation boundary and returns a typed stage failure containing the stage `name`, stage `kind`, source record identifier where known, and mapping file plus line when a mapping caused the collision. Example:

```text
Stage 'import-eventcatalog' (eventcatalog-import) failed:
  ComponentTypeMismatchError at component ID 'orders:checkout:Event:orderplaced'
  (existing type: UseCase, incoming type: Event)
  Source record: EventCatalog event 'OrderCreated'
  Mapping file: ./specs/eventcatalog-mappings.yaml
  Mapping line: 14 (events.OrderCreated.name: 'OrderPlaced')
  Hint: another mapping or code-extraction stage created a UseCase with the
        same canonical identity. Check the mapping `name` field and the
        code extracted into this domain/module.
```

Every Project-owned stage operation follows this contract, and the Workflow records the same structured failure event for the CLI log. There is no third-party handler contract in Phase 13.

**3.9.2 Scalar-conflict observability.** Under last-wins scalar merge (§3.5), an incoming scalar write that **overwrites** an existing value is a silent data-loss path. Each typed upsert returns a scoped `OperationWarning` with code `SCALAR_OVERWRITE` for every such write. The Workflow attributes those returned warnings to the active stage without diffing global Builder state, records events, and includes the count in the stage summary (`extract-shipping: imported 42 components, 3 scalar overwrites — see workflow.log.ndjson`). Every warning is also written as an NDJSON event in the single workflow log:

```json
{
  "runId": "2026-04-14T12:34:56Z#ecommerce-architecture",
  "timestamp": "2026-04-14T12:34:56Z",
  "type": "ScalarOverwrite",
  "stageName": "import-eventcatalog",
  "stageKind": "eventcatalog-import",
  "payload": {
    "componentId": "orders:checkout:Event:orderplaced",
    "field": "description",
    "oldValue": "place an order",
    "newValue": "Order has been placed by customer"
  }
}
```

`noOverwrite: true` writes that preserve a scalar do **not** warn; this is expected AI-stage behaviour. Only changed overwrites return warnings, so users can identify when a later deterministic stage won a scalar conflict.

**3.9.3 Workflow-level summary.** At workflow completion, the CLI renders one summary block from the returned Workflow events and result:

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

No domain presenter is introduced for this. The CLI composes the returned stage events, scoped operation warnings, import-summary values (§3.4.2), output path, and log path into the documented protocol format.

## 4. What We're NOT Building

Phase 13 is intentionally narrow. The exclusions below centralize the scope boundaries that appear throughout the detailed design so implementation planning has one authoritative out-of-scope list.

| Exclusion                                                                                            | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Changes to deterministic extraction behaviour itself**                                             | The `code-extraction` refactor is structural only. Phase 13 reuses the existing extraction pipeline; it does not redesign extraction rules, detection semantics, or metadata behaviour.                                                                                                                                                                                                                                                                                                                          |
| **User plugin loading or a generic stage-extension contract**                                        | Phase 13 publishes one closed union of six built-in stage variants and matches it exhaustively. It does not add a registry, arbitrary handler loading, or speculative extension API.                                                                                                                                                                                                                                                                                                                             |
| **Parallel stage execution**                                                                         | Stages run sequentially. Parallel execution is deferred.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **TypeScript workflow definitions**                                                                  | YAML + JSON Schema for now. TypeScript config files are a future option for teams wanting type safety and composability.                                                                                                                                                                                                                                                                                                                                                                                         |
| **Workflow state / caching between runs**                                                            | Each run is stateless — produces a complete graph from scratch. Incremental extraction deferred.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Per-stage checkpointing / `--only` rerun**                                                         | No Builder rehydration from prior output, checkpoint store, or `--only` flag. The authoring loop is edit config then rerun the complete Workflow.                                                                                                                                                                                                                                                                                                                                                                |
| **OpenAPI, GraphQL, Protobuf, Backstage importers**                                                  | Phase 13 includes EventCatalog and AsyncAPI (provide connection data). Component-only importers are lower value, deferred.                                                                                                                                                                                                                                                                                                                                                                                       |
| **Cross-repo linking**                                                                               | Phase 14 scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Cross-repo workflow orchestration**                                                                | Phase 14 will define how multi-repo graphs are built.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Generic workflow engine features**                                                                 | No conditionals, loops, branching, retry policies, continue-on-error, or DAG execution. Stages are sequential.                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Workflow composition**                                                                             | Workflows cannot reference or import other workflows.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Workflow migration tooling and auto-wiring existing configs**                                      | Phase 13 ships the `apiVersion: v1` marker on every workflow file and validates it at load time, but does **not** ship automated migration tooling, automatic detect-and-wire of existing extraction configs, or automatic conversion of current `riviere extract` usage into workflows. Existing-config detection prints a ready-to-copy AI-assistant migration prompt instead of attempting conversion. Future breaking changes will bump to `v2` and a migration path will be designed when that need arises. |
| **Stage partial success**                                                                            | If a stage fails, the Workflow aborts and aggregate Builder state rolls back. No partial graph replaces prior output; the log may contain events from completed stages.                                                                                                                                                                                                                                                                                                                                          |
| **Multi-output workflows**                                                                           | One workflow produces one output file. Multiple formats or artifacts require separate workflows.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Generic stage timeout / resource limits**                                                          | No generic per-stage time or memory limits beyond the AI-stage `timeout-seconds` control in §3.4.1.                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Workflow execution history / audit**                                                               | No tracking of when workflows ran or what changed between runs.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **AsyncAPI request/reply, channel/infrastructure modelling, and broader AsyncAPI semantics**         | Phase 13 supports AsyncAPI v3 publish/subscribe only. Broker infrastructure is dropped, and request/reply is explicitly rejected rather than partially modelled.                                                                                                                                                                                                                                                                                                                                                 |
| **EventCatalog fallback parser if the SDK proves insufficient**                                      | M0 contains a gating SDK spike. If the SDK cannot supply the required relationships, Phase 13 stops rather than introducing a parallel parser path.                                                                                                                                                                                                                                                                                                                                                              |
| **AI SDK dependency, token / cost / rate-limit management, secret loading, retries, prompt caching** | Phase 13 ships zero AI infrastructure. AI stages invoke a user-configured CLI (§3.4.1). Auth, cost, tokens, rate limits, retries, and caching remain the CLI's concern.                                                                                                                                                                                                                                                                                                                                          |
| **Automated AI review-and-accept loop**                                                              | Phase 13 does not add a second-pass loop that accepts or persists AI suggestions. Corrections live in Workflow and stage config files.                                                                                                                                                                                                                                                                                                                                                                           |
| **Full prompt replacement, confidence scoring, and threshold-based AI filtering**                    | Users can append instructions and memory, but Phase 13 does not expose arbitrary prompt replacement or confidence thresholds. AI responses either validate and apply additively or the stage fails.                                                                                                                                                                                                                                                                                                              |
| **Pinned-runtime AI idempotency tooling**                                                            | Phase 13 does not ship tooling for deterministic AI execution (pinned model/version, deterministic inference settings, prompt-replay). AI-inclusive workflow idempotency (criterion #13b) is therefore deferred; only deterministic-only idempotency (criterion #13a) is CI-gated. A manual verification procedure is published for teams operating their own pinned runtimes.                                                                                                                                   |

---

## 5. Success Criteria

| #   | Criterion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Verification                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The `Workflow` entity executes its active stages sequentially against the Project's private fresh Builder, owns progression/events/fail-fast state, and delegates each stage's domain behaviour to an exhaustive `RiviereProject` operation                                                                                                                                                                                                                                                                                             | Workflow entity tests plus Project aggregate tests for mixed stage sequences and failure rollback                                                                                                                                                                                                                         |
| 2   | `RiviereProject` starts every rebuild with fresh Builder state from workflow `name`, `description`, `sources`, and `domains`; `output` remains Workflow metadata returned to the CLI and is not a Builder concern                                                                                                                                                                                                                                                                                                                       | Integration test for Project rebuild startup with multiple stage variants and output-path result metadata                                                                                                                                                                                                                 |
| 3   | `eventcatalog-import` maps EventCatalog data to the obvious internal Riviere concepts needed in Phase 13 via builder, using convention-based defaults                                                                                                                                                                                                                                                                                                                                                                                   | Integration test against demo app EventCatalog                                                                                                                                                                                                                                                                            |
| 4   | `asyncapi-import` maps AsyncAPI v3 spec to the obvious internal Riviere concepts needed in Phase 13 via builder                                                                                                                                                                                                                                                                                                                                                                                                                         | Integration test against demo app AsyncAPI spec                                                                                                                                                                                                                                                                           |
| 5   | Builder ships one typed `upsert*` method per component type with `{ noOverwrite?: boolean }`, scoped operation warnings, last-wins/default and preserve-existing semantics, idempotent source/domain addition, readonly draft values, source-occurrence identity for internal Links, and tuple dedup with scoped warnings for external Links                                                                                                                                                                                            | Builder tests cover merge semantics, warnings, readonly views, internal Link occurrence preservation/duplicate failure, external Link dedup warnings, and source/domain idempotency                                                                                                                                       |
| 6   | `ai-extract` discovers components/connections that deterministic extraction missed and applies them additively without overwriting existing scalars                                                                                                                                                                                                                                                                                                                                                                                     | Integration test against demo app deliberate gaps and structured log assertions for applied AI additions                                                                                                                                                                                                                  |
| 7   | `ai-enrich` fills missing metadata fields additively without overwriting already-set scalars                                                                                                                                                                                                                                                                                                                                                                                                                                            | Integration test against demo app components with unresolved missing-field diagnostics / unset enrichable fields plus structured log assertions for applied AI enrichments                                                                                                                                                |
| 8   | `riviere workflow run` produces a valid graph from the demo workflow matching ground truth, with targeted assertions for spec-overwrite fields, additive-only AI behaviour, Link occurrence preservation, and diagnostic-log events                                                                                                                                                                                                                                                                                                     | End-to-end test: exact component IDs and full Link occurrence identities plus selected field and Workflow-event assertions                                                                                                                                                                                                |
| 9   | `riviere workflow init` produces valid Workflow YAML and stage configs                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Init creates files, `workflow validate` passes, `workflow run` succeeds                                                                                                                                                                                                                                                   |
| 10  | `workflow validate` catches invalid workflow files, missing/invalid stage configs, incompatible stage-declared domains/sources, and unavailable AI executables. `workflow run` always loads and validates the complete Project; `--skip-ai` and `--dry-run` skip executable lookup only for AI stages that will not invoke a CLI                                                                                                                                                                                                        | Tests cover structural, semantic, compatibility, and prerequisite validation; missing/invalid AI config still fails every mode, while `--skip-ai`/`--dry-run` do not require the configured AI executable                                                                                                                 |
| 11  | Workflow JSON Schema validates workflow file structure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Schema tests in `riviere-extract-config` accept documented valid examples and reject missing/invalid structural fields                                                                                                                                                                                                    |
| 12  | `WorkflowStage` is a closed published union of the six Phase 13 stage variants; the Project and Workflow match it exhaustively with no unchecked string registry, default branch, arbitrary command, or second runtime owner                                                                                                                                                                                                                                                                                                            | Compile-time exhaustive matching plus tests for each stage variant and role-enforcement location/dependency rules                                                                                                                                                                                                         |
| 13a | Workflows containing only deterministic stages are bit-for-bit idempotent under canonical serialisation                                                                                                                                                                                                                                                                                                                                                                                                                                 | CI runs the demo with AI stages disabled twice and asserts byte-equal output                                                                                                                                                                                                                                              |
| 13b | Workflows with AI stages are idempotent only under user-controlled pinned-runtime conditions; Phase 13 tooling does not provide those conditions                                                                                                                                                                                                                                                                                                                                                                                        | Explicitly deferred with a manual verification procedure and no CI gate                                                                                                                                                                                                                                                   |
| 14  | AI stage configs validate structured `command`/`args`, optional `memory` / `prompt-append`, and bounded enum-based selection and field lists rather than free-form strings                                                                                                                                                                                                                                                                                                                                                              | Schema validation tests in `riviere-extract-config`                                                                                                                                                                                                                                                                       |
| 15  | Canonical identity normalization happens in typed stage config/mappings and the corresponding Project operation, never in adapters, generic clients, the Workflow progression logic, or the CLI                                                                                                                                                                                                                                                                                                                                         | Integration test: differently named external records merge only when mappings normalize them to the same Riviere identity                                                                                                                                                                                                 |
| 16  | `schema-validate` is an optional explicit checkpoint while final output always validates                                                                                                                                                                                                                                                                                                                                                                                                                                                | Integration tests with and without the `schema-validate` stage                                                                                                                                                                                                                                                            |
| 17  | Stage summary output shows per-stage duration and total workflow duration                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Golden-output integration test asserts the summary block includes total duration plus one duration-bearing line per executed stage                                                                                                                                                                                        |
| 18  | The documented ecommerce demo app workflow transitions are verified after each completed stage, not only at final output                                                                                                                                                                                                                                                                                                                                                                                                                | Integration test compares returned stage-transition values to `tests/workflow-transitions/*.json` fixtures                                                                                                                                                                                                                |
| 19  | Every Phase 13 schema (Workflow YAML, stage configs, mapping files, Builder inputs) rejects empty strings on all string fields via `minLength: 1` or equivalent                                                                                                                                                                                                                                                                                                                                                                         | Schema-level tests assert that `""` on every string field produces a validation error                                                                                                                                                                                                                                     |
| 20  | Workflow preserves incomplete-state diagnostics outside `riviere-schema`; final graphs never contain `_missing` / `_uncertain`; the Workflow refuses successful completion while unresolved `missing-field` / `uncertain-link` diagnostics remain and calls `builder.build()` only after that check                                                                                                                                                                                                                                     | Tests cover draft-marker conversion, resolution tracking, Workflow completion refusal, and clean final graph schema                                                                                                                                                                                                       |
| 21  | Project stage operations can read the owning Workflow's unresolved diagnostics and the Builder's readonly in-progress values; only the Workflow reports/resolves diagnostics and records events; `RiviereQuery` remains a completed-graph read model                                                                                                                                                                                                                                                                                    | Workflow/Project tests show AI stages consume diagnostics and deterministic stages report/resolve them without extending or importing `RiviereQuery`                                                                                                                                                                      |
| 22  | `ai-extract` gap categories (`uncertain-links`, `missing-events`, `missing-event-handlers`, `missing-use-cases`) each have a documented computation rule and a passing test                                                                                                                                                                                                                                                                                                                                                             | Integration tests assert each gap category produces the expected candidate set against demo-app fixtures                                                                                                                                                                                                                  |
| 23  | `schema-validate` combines non-mutating `builder.validate()` with the Workflow's unresolved diagnostics and leaves all aggregate state unchanged when the stage fails                                                                                                                                                                                                                                                                                                                                                                   | Integration test inserts `schema-validate` mid-workflow, asserts graph and Workflow diagnostic errors, and proves no Builder or Workflow diagnostic mutation                                                                                                                                                              |
| 24  | Direct extraction and workflow extraction invoke `RiviereProject` operations; neither path introduces a graph write port or Builder adapter; existing CLI behaviour is unchanged                                                                                                                                                                                                                                                                                                                                                        | Existing `riviere extract` integration tests pass with no change in output JSON; Project operation tests cover direct and workflow invocation                                                                                                                                                                             |
| 25  | A `code-extraction` Workflow stage uses the same Project extraction behaviour as direct extraction; same-stage duplicate emission fails; earlier completed stage contributions compose through Builder upserts; lenient diagnostics remain Workflow state                                                                                                                                                                                                                                                                               | Integration tests prove direct/single-stage parity, same-stage duplicate failure, and multiple extraction configs contributing to one Project graph                                                                                                                                                                       |
| 26  | ts-morph `Project` instances created during `code-extraction` and their containing configuration/module state become unreachable before stage completion; multiple extraction stages do not retain compiler state                                                                                                                                                                                                                                                                                                                       | Memory-pressure and lifecycle tests run five extraction stages sequentially, assert bounded retained heap, and do not require a nonexistent ts-morph disposal API                                                                                                                                                         |
| 27  | `ecommerce-demo-app` satisfies the M0 deliverables in §7 and readiness checks R0.1-R0.10 in §3.7.1 before final §3.8-dependent gates claim completion; static source/spec work may precede executable workflow capabilities                                                                                                                                                                                                                                                                                                             | Cross-repo gate pins an approved demo-app SHA only after the applicable readiness checks pass                                                                                                                                                                                                                             |
| 28  | Phase 13 integration and E2E tests fetch `ecommerce-demo-app` at the pinned SHA and run against it; no demo-app source or fixture lives in `living-architecture`                                                                                                                                                                                                                                                                                                                                                                        | Grep in `living-architecture` for demo-app source returns empty; CI test harness clones the demo-app at the pinned SHA                                                                                                                                                                                                    |
| 29  | `eventcatalog-import.yaml`, `eventcatalog-mappings.yaml`, `asyncapi-import.yaml`, and `asyncapi-mappings.yaml` are validated through published schemas while `RiviereProjectRepository` materialises typed stages                                                                                                                                                                                                                                                                                                                       | Schema and repository tests prove invalid shapes fail before aggregate construction and valid demo mappings load                                                                                                                                                                                                          |
| 30  | `riviere workflow init` refuses to run when existing extraction configs are detected (for example `riviere-config.yaml` / `.yml`, `extraction.config.json` / `.yaml` / `.yml`, including `.riviere/config/`), prints the detected paths, emits a ready-to-copy AI-assistant migration prompt, and points to the migration guide; `docs/workflow/migrating-from-extract.md` is published and describes the five-step manual upgrade path                                                                                                 | Integration test: run `init` in a directory with seeded existing extraction configs, assert non-zero exit, no files created, stderr names the detected config paths, migration-guide path, and AI-assistant prompt                                                                                                        |
| 31  | All path fields in Workflow YAML and stage configs are resolved by `RiviereProjectRepository` relative to their declaring file, never `cwd`; aggregate behaviour receives resolved values and `~` is not expanded                                                                                                                                                                                                                                                                                                                       | Integration tests run from different working directories; repository tests cover relative, absolute, separator, and `~` cases                                                                                                                                                                                             |
| 32  | Workflow YAML requires a top-level `apiVersion: v1` field; missing or unknown values fail `workflow validate` before any other structural check with the documented error message                                                                                                                                                                                                                                                                                                                                                       | Schema test: YAML without `apiVersion`, with `apiVersion: ""`, with `apiVersion: v2`, or with any other value all fail; `apiVersion: v1` passes                                                                                                                                                                           |
| 33  | AI stages (`ai-extract`, `ai-enrich`) use one constructor-injected `AiCli` domain port with `checkAvailability(...)` and `run(...)`, implemented by one use-case adapter over a generic `child_process.spawn` client (`shell: false`). It passes prompts via stdin by default or one `{prompt}` argv placeholder, validates stdout against the published response schema, enforces `timeout-seconds`, and applies results through typed `upsert*` with `{ noOverwrite: true }`. Riviere imports no AI SDK and reads no API-key env vars | Port and adapter tests cover availability and execution over a mocked generic process client; a stub CLI integration test covers invocation; dependency assertions confirm no AI SDK; timeout tests kill the child process                                                                                                |
| 34  | `workflow run --dry-run` executes deterministic stages and returns each would-be AI prompt without invoking or applying AI output. `--skip-ai` omits AI stages from the active plan. Both modes still require valid AI configs but do not require the configured executable                                                                                                                                                                                                                                                             | Integration tests prove prompt/no-mutation behaviour, deterministic-only equivalence, required config validation, and skipped executable lookup                                                                                                                                                                           |
| 35  | `stages[].name` is unique across the Workflow, matches `^[a-z0-9-]+$`, and has `minLength: 1`; duplicates and invalid characters fail structural validation with the documented error message                                                                                                                                                                                                                                                                                                                                           | Schema tests: duplicate names, uppercase names, names with spaces or underscores, and empty names all fail; compliant names pass                                                                                                                                                                                          |
| 36  | Lenient importer stages return imported/skipped summary values and structured skipped-record Workflow events; the CLI writes their NDJSON and summary presentation                                                                                                                                                                                                                                                                                                                                                                      | Integration tests assert returned event values, NDJSON shape, CLI summary, and strict-mode absence of skip summaries                                                                                                                                                                                                      |
| 37  | `asyncapi-import` consumes only the v3 fields listed in the exhaustive scope table (§3.4); drops infrastructure fields (servers, bindings, traits); fails validation on `operations.*.reply`; tolerates unrecognised top-level keys without failure                                                                                                                                                                                                                                                                                     | Spec-driven tests: a v3 spec with a reply operation fails; a spec with only publish/subscribe operations passes; dropped fields produce no warnings and no graph mutation                                                                                                                                                 |
| 38  | All enum fields in Phase 13 schemas that exist in `riviere-schema` (notably `SystemType`, `ComponentType`, `LinkType`) are referenced via JSON Schema `$ref`, not redeclared                                                                                                                                                                                                                                                                                                                                                            | Schema tests: adding a new value to `SystemType` in `riviere-schema` is automatically accepted by workflow-validate without touching Phase 13 schemas                                                                                                                                                                     |
| 39  | Builder errors caught by Project stage operations become typed stage failures containing stage name/kind, source record identity, and mapping location when available                                                                                                                                                                                                                                                                                                                                                                   | Project integration tests trigger each stage's type-mismatch, duplicate, and unmapped paths and assert the typed failure context                                                                                                                                                                                          |
| 40  | Every changed scalar overwrite returns a scoped `SCALAR_OVERWRITE` `OperationWarning`; the Workflow records a stage-attributed event using the stable log envelope; cooperative `{ noOverwrite: true }` preservation does not warn                                                                                                                                                                                                                                                                                                      | Builder operation-result tests plus Workflow event tests; no global warning-delta inference                                                                                                                                                                                                                               |
| 41  | `workflow run` prints a workflow-level summary block at completion per §3.9.3, including per-stage duration, imported/skipped counts, scalar-overwrite counts, and the workflow-log path                                                                                                                                                                                                                                                                                                                                                | Golden-output CLI integration test asserts the summary block format exactly                                                                                                                                                                                                                                               |
| 42  | `WorkflowRunResult.transitions` returns one immutable initial snapshot and one immutable accumulated-state snapshot after each completed stage; demo fixtures serialise those public result values and are never hand-edited                                                                                                                                                                                                                                                                                                            | Domain tests cover snapshot timing and immutability; demo tooling and CI prove known-good fixture regeneration is byte-stable                                                                                                                                                                                             |
| 43  | Workflow `output` is required (no default); missing or empty `output` fails structural validation                                                                                                                                                                                                                                                                                                                                                                                                                                       | Schema tests: workflow without `output` fails; `output: ""` fails; any non-empty string passes                                                                                                                                                                                                                            |
| 44  | `ai-extract` source-scope overflow fails the stage with the documented error; silent truncation is disallowed                                                                                                                                                                                                                                                                                                                                                                                                                           | Integration test exceeds the configured bound and asserts the typed stage failure                                                                                                                                                                                                                                         |
| 45  | The Project-owned workflow implementation follows existing monorepo hygiene: ADR-002 locations, existing honest roles on every export, 100% test coverage, workspace-reference imports only, exhaustive stage matching, and adapter isolation so only use-case `infra/external-clients` may import `@eventcatalog/sdk`, `@asyncapi/parser`, or Node `child_process`                                                                                                                                                                     | Role enforcement, lint, and coverage gates green on CI, including dependency rules that forbid vendor SDK/parser/process imports outside generic external clients                                                                                                                                                         |
| 46  | Architecture docs describe the Project-owned workflow boundary and record that `RiviereProject` is the sole aggregate, `Workflow` is its entity, stages are immutable closed values, and no second workflow runtime/package owns execution                                                                                                                                                                                                                                                                                              | Doc assertions confirm the architecture overview and ADR describe the approved aggregate/entity/stage boundary and Builder ownership                                                                                                                                                                                      |
| 47  | Workflow/importer terminology and dependency docs are updated: the glossary includes Project-owned Workflow/Stage terms, and architecture docs mention `@eventcatalog/sdk` and `@asyncapi/parser` only at the generic-client boundary                                                                                                                                                                                                                                                                                                   | Doc assertions confirm `Workflow`, `Workflow Stage`, `Stage Config`, `Mappings File`, and `Canonical Identity` plus both isolated importer dependencies                                                                                                                                                                   |
| 48  | Operator-facing docs capture the AI CLI shell-out boundary and deferred AI idempotency expectations without implying an SDK/auth surface in Riviere                                                                                                                                                                                                                                                                                                                                                                                     | Grep/doc assertions confirm docs state `command` + `args`, `child_process.spawn`, no AI SDK/auth handling in Riviere, and manual-only AI idempotency guidance                                                                                                                                                             |
| 49  | Role enforcement rejects public aggregate-loading methods whose names do not match `load` or `loadBy<AccessCriterion>`; role documentation requires the suffix to name a real aggregate lookup criterion. Optional persistence methods such as `save` and private assembly helpers are unaffected                                                                                                                                                                                                                                       | Role-enforcement tests accept `load`, `loadById`, `loadByGraphPath`, `loadByExtractionConfigPath`, `loadByExtractionConfigAndDraftComponentsPaths`, and `loadByWorkflowName`; reject `loadBy`, `loadWorkflow`, `loadForEnrichment`, and `loadFromPersistedState`; semantic review rejects operation-labelled names such as `loadByEnrichment` |

---

## 6. Open Questions

No unresolved product, architecture, or delivery questions remain.

---

## 7. Milestones

### 7.0 Current `main` reconciliation and remaining delivery

This subsection is the approved delivery baseline produced by reviewing `main` on 2026-09-01. It supersedes package/runtime ownership and sequencing statements later in §7 where they conflict with this subsection or the architecture reconciliation at the top of this PRD. Historical completed and `not planned` issues are evidence only; remaining work must be created as new issues from this baseline.

Current `main` already provides:

- the approved `RiviereProject` aggregate, owned `Workflow` entity, private mutable `RiviereBuilder`, fresh rebuild state, failure rollback, and direct graph application described by Appendix A
- sequential fixed-stage execution and workflow events for the existing extraction-only stage language
- most typed Builder upsert behaviour, last-wins scalar handling, `noOverwrite`, array union, and source/domain idempotency
- initial workflow parsing, named loading, schema validation, strict extraction, accumulated components, linking, and final validation

Current `main` does not provide the complete Phase 13 customer workflow. The remaining deliverables are:

| Issue slice                                     | Delivery refs          | Remaining outcome                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Aggregate-repository loading-method enforcement | D1.0                   | Add the approved role constraint for `load` or `loadBy<AccessCriterion>`, document semantic honesty, and replace current methods with graph-path, extraction-config-path, Draft Components-path, and temporary Workflow-name access patterns without aliases.                                          |
| Demo external sources                           | D0.2                   | Add the EventCatalog and AsyncAPI sources, mappings, strict fixture validation, and SDK/parser capability spikes without changing deterministic extraction.                                                                                                                                            |
| Project-owned workflow lifecycle                | D1.1                   | Replace the fixed extraction-only stage language with the approved closed six-stage union; keep progression, active-plan derivation, events, diagnostics, and fail-fast behaviour on the Workflow entity.                                                                                              |
| Residual Builder workflow capabilities          | D1.2                   | Expose the readonly in-progress Builder values needed by later stages and lock the already-delivered source-occurrence Link identity and scoped operation-warning behaviour with regression coverage, without adding a query-package cycle.                                                            |
| Direct/workflow extraction parity               | D1.3                   | Reuse the same Project extraction behaviour, preserve same-stage duplicate failure, convert incomplete extraction state into Workflow diagnostics, and release all references to stage-scoped TypeScript compiler state after each stage.                                                              |
| Strict Phase 13 workflow language               | D1.5                   | Replace the unpublished fixed-stage dialect with `apiVersion: v1`, file-addressed workflow execution, strict typed stage configs, file-relative path materialisation, shared schema references, and exhaustive parser output. Remove the unpublished fixed dialect rather than supporting two formats. |
| EventCatalog stage                              | D2.1                   | Add strict configs/mappings, isolated SDK client and adapter, domain mapping behaviour, strict/lenient outcomes, links, diagnostics, and tests.                                                                                                                                                        |
| AsyncAPI stage                                  | D2.2                   | Add strict configs/mappings, isolated parser client and adapter, the approved v3 publish/subscribe scope, diagnostics, and tests.                                                                                                                                                                      |
| Validation and compatibility                    | D2.3                   | Make `schema-validate` an optional non-mutating checkpoint while final build remains mandatory; validate source/domain compatibility and unresolved diagnostics before unsafe execution.                                                                                                               |
| Shared AI CLI boundary                          | D3.1                   | Add one `AiCli` domain port with availability and execution operations, one isolated process client and adapter, command/args/timeout handling, strict response schemas, and stub integration tests without an AI SDK or credential surface.                                                           |
| AI extraction stage                             | D3.2                   | Implement bounded gap-driven additive component/link discovery, overflow failure, prompt review, diagnostics, and `noOverwrite` application.                                                                                                                                                           |
| AI enrichment stage                             | D3.3                   | Implement configured missing-field enrichment against existing components while preserving every deterministic scalar.                                                                                                                                                                                 |
| Workflow run and validate CLI                   | D4.1                   | Add file-addressed non-interactive run/validate entrypoints, active run modes, actionable failures, Workflow-event NDJSON writing, completion summary, and atomic final graph replacement only after success.                                                                                          |
| Greenfield workflow init                        | D4.2                   | Add greenfield-only interactive generation, existing-config refusal, no-write safety, and the approved migration prompt.                                                                                                                                                                               |
| Architecture, terminology, and operator docs    | D1.4, D2.4, D3.4, D4.3 | Update the overview, ADR, glossary, importer/AI dependency documentation, workflow summary documentation, and manual migration guide after the owning capabilities stabilize. The proposal groups these documentation deliverables into one issue.                                                     |
| Executable demo workflow and fixtures           | D0.3                   | After M1-M4 exist, add the root workflow, stage configs, ground truth, transition fixtures generated from returned production snapshots, serialization tooling, and README workflow journey in `ecommerce-demo-app`.                                                                                   |
| Pinned demo coordination                        | D0.4, D5.3             | Pin the demo revision, document coordinated fixture updates, and keep all customer source/fixtures owned by the demo repository. The proposal groups these cross-repository deliverables into one issue.                                                                                               |
| Full workflow ground-truth gate                 | D5.1                   | Run the pinned demo workflow and require exact final Component IDs, Link occurrences, selected overwrite/additive semantics, and workflow-log events.                                                                                                                                                  |
| Transition and deterministic-idempotency gate   | D5.2                   | Verify generated state after every completed stage and require byte-identical canonical output for two `--skip-ai` runs.                                                                                                                                                                               |

Sequencing after reconciliation:

1. D1.0 gates remaining `living-architecture` product work because repository-wide role verification must be green; D0.2 in the separate demo repository can proceed in parallel.
2. D1.2 precedes D1.1 because supported complete transition snapshots require readonly Builder values.
3. D1.1 precedes D1.5 because strict loading materialises the final closed stage language; D1.3 follows both and proves extraction parity and lifecycle safety.
4. D2 and D3 stage capabilities may proceed independently once their named M1 dependencies are complete.
5. D4.1 follows executable stage behaviour; D4.2 requires strict loading and validation. Documentation closes after both command protocols stabilize.
6. D0.3 executable fixtures begin only after the required capabilities exist. Static source/spec groundwork does not wait for those capabilities.
7. D5 begins only after the executable demo workflow and immutable pinned-revision contract are complete.

Detailed design remains in §3; this section is the delivery contract. Checks R0.1-R0.10 in §3.7.1 define demo readiness without forcing executable fixtures to precede their implementation.

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
  - Key scenarios: root `riviere-workflow.yaml` references the existing extraction config; workflow ground truth exists; transition fixtures are generated from `WorkflowRunResult.transitions` rather than hand-edited.
  - Acceptance criteria: `riviere workflow validate` passes against the demo repo; `tests/workflow-ground-truth.json` covers the complete Workflow; transition fixtures exist for every stage.
  - Verification: after the required M1-M4 capabilities land, run `workflow validate`, serialize `WorkflowRunResult.transitions`, and assert a clean fixture diff in CI.
- **D0.4:** Inter-repo contract and README updates land
  - Key scenarios: `living-architecture` pins a demo-app SHA; coordinated fixture updates have an explicit path; README adds a Phase 13 workflow section without removing the current deterministic guide.
  - Acceptance criteria: pinned SHA and dependency-update process exist; README preserves pre-Phase-13 guidance verbatim and adds workflow guidance as the next step.
  - Verification: grep/assertions confirm the pinned SHA is referenced by CI config, the coordination template/file exists, and the demo-app README contains both the preserved deterministic guide and the new Phase 13 workflow section.

### M1: Project-owned Workflow and shared Builder are in place

The repository can load a complete Project, and its Workflow entity can derive an active plan and progress sequential stages against one private `RiviereBuilder` owned by `RiviereProject`. **The earlier builder-facade decision is superseded. See Appendix A.**

#### Deliverables

- **D1.0:** Aggregate-repository loading-method names are role-enforced
  - Key scenarios: public aggregate-loading methods named `load` and `loadBy*` pass; other public aggregate-loading names fail; optional persistence methods and private helpers are unaffected.
  - Acceptance criteria: role configuration expresses the lexical rule and role documentation requires a real access criterion; tests cover accepted `load`, `loadById`, `loadByGraphPath`, `loadByExtractionConfigPath`, `loadByExtractionConfigAndDraftComponentsPaths`, and `loadByWorkflowName`, plus rejected `loadBy`, `loadWorkflow`, `loadForEnrichment`, and `loadFromPersistedState`; current repository methods are replaced without operation-labelled aliases.
  - Verification: role-enforcement domain-model and use-case tests pass, and the repository-wide role check reports no aggregate-repository loading-name violations.
- **D1.1:** Project-owned Workflow executes validated plans
  - Key scenarios: sequential execution, active-plan derivation for `--skip-ai` / `--dry-run`, fail-fast validation before execution.
  - Acceptance criteria: the closed stage union is matched exhaustively; the Workflow owns progression/events/failure state; the Project owns stage behaviour and fresh Builder lifecycle; run-mode prerequisite checks apply only to stages that invoke external capabilities.
  - Verification: Workflow entity and Project aggregate tests cover all stage variants, mixed execution plans, and failure rollback.
- **D1.2:** Builder supports multi-source graph construction
  - Key scenarios: typed `upsert*` merge on the same canonical ID, `noOverwrite`, scoped operation warnings, idempotent sources/domains, readonly draft values, internal Link occurrences, and external-Link dedup warnings.
  - Acceptance criteria: the existing upsert and warning behaviour remains intact; Builder exposes readonly components/Links/external Links; same-endpoint internal occurrences remain distinct; exact duplicate occurrences fail.
  - Verification: focused `riviere-builder` unit and regression tests for draft reads, merge, warning attribution, and occurrence identity.
- **D1.3:** `code-extraction` reuses `RiviereProject` extraction behaviour
  - Key scenarios: direct CLI and Workflow stages invoke Project operations; no graph write port or Builder adapter exists; same-stage duplicate emission fails; lenient draft markers become Workflow diagnostics.
  - Acceptance criteria: `riviere extract` remains output-compatible; single-stage Workflow parity is proven; earlier completed stage contributions compose through the Project's Builder.
  - Verification: parity tests, same-stage duplicate tests, multiple-configuration Workflow tests, and retained-reference/heap tests for repeated extraction stages.
- **D1.4:** Architecture documentation records the Project-owned Workflow boundary
  - Key scenarios: the architecture overview shows the existing package boundaries, an ADR records Project/Workflow/Stage ownership, and glossary terms use the approved model.
  - What doc to update and why: update `docs/architecture/overview.md`; add an ADR for the aggregate/entity/closed-stage and Builder boundary; update workflow terminology.
  - Acceptance criteria: docs identify `RiviereProject` as sole aggregate, Workflow as entity, stages as immutable values, and external capabilities as Project ports; no second workflow package/runtime appears.
  - Verification: doc assertions confirm the package diagram, ADR, and glossary entries.
- **D1.5:** Workflow schema and aggregate loading are strict by default
  - Key scenarios: workflow schema enforces `apiVersion`, required `output`, unique/patterned stage names, and empty-string rejection; repository loading resolves paths relative to their declaring files and narrows every stage config before aggregate construction.
  - Acceptance criteria: schema tests cover structural rules; repository tests prove file-relative paths and complete typed Project loading; role enforcement, coverage, exhaustive matching, and import boundaries apply in the existing packages.
  - Verification: schema test suite, resolver unit tests, and CI role-enforcement/lint/coverage assertions, including import-boundary rules for the adapter layer.

### M2: Deterministic spec and validation stages work end-to-end

Users can combine deterministic code extraction with spec imports and an explicit validation checkpoint.

#### Deliverables

- **D2.1:** `eventcatalog-import` works with convention defaults and mappings overrides
  - Key scenarios: canonical identity normalization, strict vs lenient unmapped handling, producer/consumer link creation.
  - Acceptance criteria: demo EventCatalog imports into the shared builder and logs skipped records only in lenient mode.
  - Verification: integration tests against the demo EventCatalog plus schema tests for stage and mapping files.
- **D2.2:** `asyncapi-import` works within the defined v3 scope boundary
  - Key scenarios: message/operation mapping, payload metadata import, request/reply rejection, silent drop of out-of-scope infrastructure fields.
  - Acceptance criteria: demo AsyncAPI spec imports successfully for publish/subscribe flows; request/reply specs fail with the documented error.
  - Verification: spec-driven integration tests plus schema tests for stage and mapping files.
- **D2.3:** `schema-validate` and workflow compatibility checks fail cleanly
  - Key scenarios: mid-Workflow validation, unresolved-diagnostic reporting, incompatible Workflow/stage source-domain declarations, and file-relative path resolution.
  - Acceptance criteria: `builder.validate()` is used for checkpoint validation; compatibility and path-resolution failures are surfaced before execution.
  - Verification: integration tests with and without `schema-validate`; resolver unit tests; compatibility validation tests.
- **D2.4:** Architecture docs reflect new importer dependencies and mapping terminology
  - Key scenarios: architecture docs show importer dependencies, glossary entries explain mapping terminology, and planning terminology aligns with importer behaviour.
  - What doc to update and why: update `docs/architecture/overview.md` for isolated importer clients; extend the glossary with `Workflow`, `Workflow Stage`, `Stage Config`, `Mappings File`, and `Canonical Identity`.
  - Acceptance criteria: architecture docs mention both importer dependencies; glossary additions cover importer-facing workflow terms and mapping terminology.
  - Verification: grep/doc assertions confirm the dependency names appear in architecture docs and the required glossary terms are present.

### M3: AI stages add bounded, additive enrichment

AI-assisted Workflow stages operate through a user-supplied CLI without introducing a provider SDK surface.

#### Deliverables

- **D3.1:** Shared AI CLI invocation contract exists
  - Key scenarios: `command` + `args`, stdin or single `{prompt}` substitution, timeout enforcement, strict stdout schema validation.
  - Acceptance criteria: `RiviereProject` invokes one AI CLI port; its use-case adapter calls a generic process client using `child_process.spawn` with `shell: false`; malformed stdout and timeout cases fail cleanly.
  - Verification: Project port tests, adapter tests with a mocked generic process client, and a stub CLI integration test.
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
  - Key scenarios: complete Project loading, active-plan handling, deterministic execution, preserved NDJSON log, and atomic final graph replacement.
  - Acceptance criteria: both commands surface documented errors; run modes always validate configs but skip unused AI executable checks; failure preserves an existing output graph; the CLI renders returned events and results without owning stage progression.
  - Verification: CLI integration tests cover success, validation failure, and stage failure paths.
- **D4.2:** `riviere workflow init` is greenfield-only and migration-safe
  - Key scenarios: existing-config detection and refusal, ready-to-copy AI migration prompt, and successful greenfield generation of a workflow that validates and runs.
  - Acceptance criteria: init creates files only in greenfield scenarios; the generated workflow passes `workflow validate` and `workflow run`; non-greenfield runs refuse with the documented prompt and create no files.
  - Verification: integration tests cover both the greenfield success path and the existing-config refusal path.
- **D4.3:** CLI output and migration docs are complete
  - Key scenarios: stage summary output, migration guide from `extract`, and prompt-review mode via `--dry-run`.
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
  - Key scenarios: after-stage fixture comparison, non-mutating `schema-validate`, and deterministic-only double-run equality under `--skip-ai`.
  - Acceptance criteria: transition fixtures pass after every stage; deterministic-only runs are byte-equal under canonical serialization.
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
| D1.0        | #49                               |
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

Parallel work is by delivery track, not Workflow-stage execution. Stage execution remains sequential; implementation can proceed in parallel once dependencies are satisfied.

```yaml
tracks:
  - id: A
    name: Builder and extraction-core refactor
    deliverables:
      - D1.2
      - D1.3
  - id: B
    name: Project Workflow language and CLI surface
    deliverables:
      - D1.0
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
    name: AI Workflow stages
    deliverables:
      - D3.1
      - D3.2
      - D3.3
  - id: E
    name: Demo app sources then executable fixtures
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

- D1.0 is the first blocking deliverable. Every other remaining issue depends on its role-enforcement guardrail.
- Static D0.2 source/spec work can begin after D1.0. D0.3 executable fixtures and D0.4 pinned-SHA coordination wait for the required M1-M4 capabilities.
- D1.2 and D1.3 gate D2.1, D2.2, D3.2, and D3.3 because later stages rely on Builder upserts, draft reads, and extraction parity.
- D1.5 gates D2.1, D2.2, D3.1, and D4.1 because importer, AI, and CLI work all rely on the shared schema strictness and file-resolution contract.
- D1.1 gates D4.1 because the CLI commands are thin entrypoints over the Project-owned Workflow lifecycle.
- D3.1 gates D3.2 and D3.3 because both AI stages share the CLI invocation and response-validation contract.
- Track A hands typed upsert semantics, draft reads, and extraction parity to tracks C and D before importer and AI-stage implementation can stabilize.
- Track B hands the typed Workflow language, validation flow, returned event contract, and CLI protocol to tracks C, D, E, and G before end-to-end verification can lock fixtures.
- Track C hands deterministic merged-state fixtures to track G; track D hands AI stub/response-schema fixtures to track G.
- Track E starts early with static sources/specs, then adds executable configs/fixtures after tracks A-D stabilize Project stage behaviour and CLI contracts. Track G starts after that executable baseline is approved.
- Track F starts incrementally after the owning product boundary is stable: D1.4 after D1.1-D1.3, D2.4 after D2.1-D2.3, and D3.4 after D3.1-D3.3.

---

## 9. Architecture

Phase 13 extends the existing Project aggregate rather than inserting another workflow runtime owner. The same `RiviereProject` lifecycle serves direct graph commands, direct TypeScript extraction, and multi-source workflow rebuilds.

**Before Phase 13:**

```text
riviere-cli
  -> riviere-extract-ts use cases
       -> RiviereProject
            -> private RiviereBuilder
```

**After Phase 13:**

```text
riviere-cli
  -> riviere-extract-ts use cases
       -> RiviereProject aggregate
            ├── private RiviereBuilder value object
            └── Workflow entities
                 └── ordered WorkflowStage value objects

RiviereProject domain ports
  <- EventCatalog adapter <- generic EventCatalog SDK client
  <- AsyncAPI adapter     <- generic AsyncAPI parser client
  <- AI CLI adapter       <- generic child-process client
```

**Module boundary and responsibilities:**

- `riviere-cli` remains a thin shell exposing `workflow run`, `workflow init`, `workflow validate`, and the existing direct extraction command.
- `RiviereProject` remains the sole aggregate. It owns private graph-construction state, its Workflow entities, the empty-start rebuild invariant, failure rollback, and stage-specific domain operations.
- `Workflow` remains an aggregate entity. It owns identity, run state, active-plan derivation, ordered progression, fail-fast behaviour, events, diagnostics, and warnings.
- `WorkflowStage` remains an immutable value object represented by an exhaustive union of the six Phase 13 built-in stage variants.
- `riviere-extract-ts` use cases own command orchestration, complete Project loading, domain-port adapters, and generic external clients. The `RunWorkflow` command loads one Project, invokes one aggregate operation, and returns one typed result; it has no stage loop or output formatting.
- `RiviereProjectRepository` loads the complete Project and every validated stage configuration. It resolves file-relative paths while materialising aggregate state and never executes a stage.
- `riviere-builder` remains the graph-construction authority; Phase 13 extends it with typed upsert semantics rather than introducing a parallel graph-merge layer.
- `riviere-extract-config` owns workflow, importer, mapping, and AI response schemas so validation rules stay centralized.
- `riviere-extract-ts` remains the deterministic extractor. Direct extraction and workflow extraction invoke the same `RiviereProject` behaviour.
- `RiviereBuilder` exposes the minimal readonly in-progress graph view needed by later stages. `RiviereQuery` remains for valid completed graphs and is not pulled into the mutable Builder package through a dependency cycle.
- the workflow CLI entrypoint owns protocol presentation: writing NDJSON from returned Workflow events and atomically replacing the final graph only after aggregate success. It does not own event meaning, stage progression, or graph-building decisions.

**File-addressed state loading and invocation:**

```typescript
const project = projectRepository.load(input.workflowPath)
const result = project.rebuildGraph(input.mode)
```

`RiviereProjectRepository.load` is the `aggregate-repository` operation and returns one complete `RiviereProject`. `workflowPath` locates the persisted Workflow definition; it is not domain operation state. The repository parses the file, resolves `output` and every stage-config path relative to its declaring file, validates and narrows all stage configs, uses the YAML `name` as the loaded Workflow entity identity, materialises the graph definition from `name`, `description`, `sources`, and `domains`, and loads any prior output graph only as the rollback baseline. The returned Project designates that file-loaded Workflow as the Workflow for `rebuildGraph(mode)`. Run mode remains operation input and never changes what aggregate state the repository loads. A Workflow-specific repository method is not part of the approved design.

**Constructor dependency inversion:** The CLI shell constructs the EventCatalog, AsyncAPI, stage-scoped TypeScript extraction, and `AiCli` adapters and injects their domain-port implementations into `RiviereProjectRepository`:

```typescript
const projectRepository = new RiviereProjectRepository({
  aiCli,
  loadAsyncApiDocument,
  loadCodeExtraction,
  loadEventCatalogSource,
})
```

The repository supplies those already-injected collaborators to `RiviereProject` while constructing it. The loaded state is only the persisted Workflow definition, resolved typed stage configs, graph definition, output metadata, and prior-output rollback baseline. Runtime collaborators are not loaded state, are not serialized, and never appear in `load(...)` parameters.

Current non-Workflow access patterns remain explicit and honest. D1.0 first replaces the overloaded and operation-labelled methods with `loadByGraphPath(...)`, `loadByExtractionConfigPath(...)`, `loadByExtractionConfigAndDraftComponentsPaths(...)`, and temporary `loadByWorkflowName(...)`. D1.5 then adds canonical file-addressed `load(workflowPath)` and removes `loadByWorkflowName(...)`; the other access-pattern methods remain for current graph and extraction commands.

`RunWorkflow` receives `workflowPath` and `mode`, performs exactly the two calls above, and returns the typed aggregate result. It does not parse YAML, select stages, construct a Builder, loop over stages, write files, or format events. The CLI input factory supplies `workflowPath` from the positional argument and `mode` from `--skip-ai` / `--dry-run`; the CLI entrypoint writes the returned events and graph.

**Ownership rule:** There is no second workflow engine, runtime aggregate, application orchestrator, generic stage handler registry, or string-keyed operation map. The Workflow entity owns the process lifecycle; the Project owns graph state and stage domain behaviour; adapters provide only external capabilities.

**Builder/workflow ownership split:** `riviere-builder` owns graph construction, typed upsert semantics, construction warnings, readonly in-progress graph values, and graph-only validation/finalization. Workflow diagnostics and progression are Workflow entity state. The Workflow combines diagnostic checks with direct `RiviereBuilder` validation before finalisation. See Appendix A.

**Internal package shape (ADR-002-aligned):**

```text
packages/riviere-extract-ts/domain-model/src/domain/
  riviere-project.ts
  workflow.ts
  workflow-stage.ts
  workflow-diagnostics.ts
  ports/
    load-eventcatalog-source.ts
    load-asyncapi-document.ts
    load-code-extraction.ts
    ai-cli.ts

packages/riviere-extract-ts/use-cases/src/
  features/extract/
    commands/
      run-workflow.ts
      validate-workflow.ts
    data-access/riviere-project/
      riviere-project-repository.ts
    adapters/
      eventcatalog/
      asyncapi/
      ai-cli/
  infra/external-clients/
    eventcatalog-sdk/
    asyncapi-parser/
    child-process/

apps/cli/src/features/workflow/entrypoint/
  run-workflow/
  validate-workflow/
  init-workflow/
```

**Import-boundary rules:**

- Only the generic child-process external client may import Node `child_process`.
- Only the generic EventCatalog external client may import `@eventcatalog/sdk`.
- Only the generic AsyncAPI external client may import `@asyncapi/parser`.
- Domain-port adapters depend on one Project-owned port and one generic client. They translate contracts and contain no stage sequencing, mapping rules, graph mutation, or multi-client coordination.
- Domain code, commands, repositories, and CLI entrypoints do not import vendor SDK/parser/process APIs.
- The closed stage union is matched exhaustively. Domain code must not use the TypeScript `in` operator or duplicate published stage names in unchecked string literals.

**Architecture alignment with existing docs:**

- Aligns with `docs/architecture/overview.md` by keeping extraction, builder, schema, and query responsibilities separate and composable.
- Aligns with ADR-001 by preserving extraction metadata logic in the extraction pipeline rather than moving extraction semantics into workflow glue.
- Aligns with ADR-002 by retaining the existing domain-model/use-cases/app boundaries and placing ports, adapters, external clients, repositories, commands, and entrypoints in their enforced locations.

**New dependencies and boundaries:**

- No new workflow package or architectural role.
- New npm dependencies exist only in `riviere-extract-ts` use-case external-client code: `@eventcatalog/sdk` and `@asyncapi/parser`.
- AI CLIs are execution prerequisites only. They are not npm dependencies, and no AI SDK/auth boundary is introduced into the codebase. Process spawning is isolated in the generic process client behind the Project's AI CLI port adapter.

**Documentation that must be updated during delivery:**

- `docs/architecture/overview.md` — show the Project-owned workflow model and external adapter boundaries.
- `docs/architecture/domain-terminology/contextive/definitions.glossary.yml` — add Workflow, Workflow Stage, Stage Config, mapping, diagnostics, and AI CLI terminology.
- New ADR — capture the Project/Workflow/Stage ownership, exhaustive stage language, external-port boundary, and the choice to shell out to user-configured AI CLIs instead of embedding an SDK.

**Architecture review focus:**

- Whether stage behaviour remains with `RiviereProject` and progression remains with its Workflow entity rather than leaking into use cases, repositories, adapters, or the CLI.
- Whether typed Builder upserts and the minimal readonly Builder view remain the graph-construction seam rather than creating a second graph model or query-package cycle.
- Whether importer-specific dependencies stay isolated inside generic external clients and single-port adapters rather than leaking into domain code.
- Whether the AI CLI boundary is sufficiently explicit to avoid accidental credential, SDK, or retry/cost logic creeping into core packages.
- Whether direct extraction and workflow extraction remain behaviourally identical while multiple workflow configurations contribute safely through one Builder owned by the Project.

---

## 10. Dependencies

**Depends on:**

- Phase 12 (Connection Detection) — the `code-extraction` stage runs the Phase 10/11/12 pipeline and assumes its extraction config and `EnrichedComponent` contracts.

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

- **No SDK dependency.** `RiviereProject` uses an AI CLI domain port implemented by a use-case adapter over a generic `child_process.spawn` client — see §3.4.1.
- Prompt strategies for bounded code analysis are Project-owned stage behaviour; prompts are constructed deterministically from readonly Builder values, Workflow diagnostics, and a stage-specific template. Riviere does not ask the CLI to self-report confidence and does not record a confidence score on AI-added graph elements.
- Response JSON schemas (one per AI stage kind) are published in `riviere-extract-config` and validate CLI stdout before the adapter returns a typed response to the Project.

---

## 12. Terminology

| Term                     | Definition                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workflow**             | An aggregate entity owned by `RiviereProject`. It has identity and run state and owns ordered stage progression, fail-fast behaviour, events, warnings, and diagnostics. A validated YAML definition is one persisted representation loaded by the Project repository.                                                                |
| **Workflow Builder**     | **Superseded. See Appendix A.** The Project owns a private `RiviereBuilder`; no Workflow-specific Builder facade exists.                                                                                                                                                                                                              |
| **Workflow Stage**       | An immutable value object in the owning Workflow's closed ordered stage union. The Project exhaustively performs the stage's domain behaviour while the Workflow owns progression.                                                                                                                                                    |
| **Stage Kind**           | One of `code-extraction`, `eventcatalog-import`, `asyncapi-import`, `ai-extract`, `ai-enrich`, or `schema-validate`.                                                                                                                                                                                                                  |
| **Stage Config**         | Validated typed configuration specific to a stage kind, stored in a separate file referenced by the workflow representation and resolved by `RiviereProjectRepository`.                                                                                                                                                               |
| **Project Domain Port**  | An explicit capability needed by Project behaviour, such as loading EventCatalog/AsyncAPI data or invoking an AI CLI. A use-case adapter implements one port over one generic external client and contains no domain decisions.                                                                                                       |
| **Workflow Diagnostics** | Workflow-owned state for unresolved draft-only diagnostics. Project stage operations report outcomes to the Workflow, which records and resolves diagnostics and emits events.                                                                                                                                                        |
| **AI CLI**               | The user-configured command-line tool invoked through the Project's AI CLI port and use-case adapter over a generic process client (for example `command: claude`, `args: ['-p']`). Riviere never imports an AI SDK; the CLI handles auth, cost, tokens, rate limits, retries, and model selection.                                   |
| **Workflow Log**         | The structured NDJSON artefact written by the CLI from returned Workflow events. It contains stage progress, overwrites, skipped imports, AI actions, diagnostics, and failures.                                                                                                                                                      |
| **Mappings File**        | Configuration defining how external data models (EventCatalog, AsyncAPI) map to Riviere concepts. Convention-based defaults with explicit overrides.                                                                                                                                                                                  |
| **Canonical Identity**   | The final Riviere component identity produced by stage mappings/config and Project behaviour before the Builder sees it. Upsert happens only after identity is established.                                                                                                                                                           |
| **Upsert**               | Typed builder capability (one `upsert*` method per component type) to add-or-merge a component. If the component ID already exists, scalar fields are merged **last-wins** by default (or preserved under `{ noOverwrite: true }`) and array fields union. If not, it creates the component. Enables multi-source graph construction. |
| **noOverwrite**          | Option on every `upsert*` method. When true, scalars apply only where the existing value is `undefined`/`null`; arrays still union. AI stages always use it and preserve deterministic values.                                                                                                                                        |
| **Workflow Init**        | Interactive CLI command (`riviere workflow init`) that creates a Workflow definition and its stage configs for a greenfield repository.                                                                                                                                                                                               |

---

## Appendix A: Current Builder Integration

The earlier builder-facade design is superseded. `RiviereProject` directly depends on and privately owns `RiviereBuilder`. For each rebuild it creates fresh Builder state, gives that Builder directly to its selected `Workflow`, and restores the prior Builder state if the run fails.

`Workflow` applies extraction output directly through the published Builder API. `EnrichedComponent.toComponentDefinition(repository)` creates typed component definitions; the Workflow dispatches each definition to the corresponding `upsert*` operation and applies internal and external links through `link` and `linkExternal`. Required graph fields are validated by the published definition value before Builder mutation.

No graph-write port, Builder adapter, Builder facade, or `ApplyExtractionToGraph` service is part of the current architecture. Workflow diagnostics are entity state and do not change Builder ownership or API access.
