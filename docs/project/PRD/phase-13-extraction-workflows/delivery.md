# Delivery Plan: Phase 13 Extraction Workflows

**Status:** Approved

---

## 1. Delivery summary

Phase 13 lands as a repository-rule gate, three Project/Builder foundations, independent deterministic and AI capability tracks, file-addressed CLI commands, documentation, and a pinned customer gate. Static demo source/spec work can proceed while product foundations land. Executable demo fixtures wait for the supported production Workflow result. Dependencies below replace the previous blanket claim that every issue depends directly on D1.0.

## 2. Milestones and deliverables

### M0: Demo source groundwork is ready

#### D0.2: Add Phase 13 EventCatalog and AsyncAPI demo sources

- Value: the customer fixture has believable external sources and canonical mappings before importer implementation is complete.
- Acceptance criteria:
  - `ecommerce-demo-app` contains the six source/config/mapping paths specified in `dogfooding.md` D0.2.
  - The EventCatalog SDK capability test proves domains, services, events, producer, and consumer relationships against the fixture or stops Phase 13 without a fallback parser.
  - The AsyncAPI v3 fixture parses and contains no request/reply operation.
  - Existing extraction configs, fixtures, scripts, and source are unchanged.
- Verification:
  - Run the demo's existing `scripts/verify-extraction.mjs` and `scripts/verify-connections.mjs`; both retain their current passing result.
  - Run the new SDK/parser fixture tests; every required fact is readable.
- Dependencies:
  - None; this separate-repository groundwork may proceed in parallel with D1.0.
- Out of scope:
  - Executable Workflow, generated transition fixtures, or a final pinned SHA.
- Source refs:
  - PRD: §§4 and 6.
  - Architecture: §§3.6 and 3.9.
  - Dogfooding: §3.1 D0.2.

### M1: Project-owned Workflow foundation is complete

#### D1.0: Enforce honest aggregate-repository loading method names

- Value: repository methods expose real aggregate access patterns before Phase 13 adds canonical Workflow loading.
- Acceptance criteria:
  - Role enforcement accepts `load` and `loadBy<AccessCriterion>` for public aggregate-returning repository methods and rejects bare or differently named loading methods.
  - Documentation requires a real access criterion and rejects operation-labelled `loadByEnrichment`.
  - Existing calls migrate to `loadByGraphPath`, `loadByExtractionConfigPath`, `loadByExtractionConfigAndDraftComponentsPaths`, and temporary `loadByWorkflowName` with no aliases.
- Verification:
  - Role-enforcement tests cover every accepted and rejected name in `ARCH.md` §3.3.
  - `pnpm verify` passes with no repository loading-name violation.
- Dependencies:
  - None.
- Out of scope:
  - Canonical file-addressed `load(workflowPath)`, delivered by D1.5.
- Source refs:
  - PRD: §4 loading safety requirement.
  - Architecture: §3.3.

#### D1.2: Expose readonly in-progress Builder values

- Value: Project stages and supported result snapshots can inspect exact accumulated graph state without building an invalid intermediate graph.
- Acceptance criteria:
  - Builder exposes immutable `components()`, `links()`, and `externalLinks()` snapshots.
  - Existing typed upserts, warning attribution, internal Link occurrence identity, and external-Link deduplication remain intact.
  - No mutable internal collection or `RiviereQuery` dependency is exposed.
- Verification:
  - Builder tests prove immutability, exact values, occurrence preservation, and warning behaviour.
  - Existing 80,000-item Builder performance coverage remains passing.
- Dependencies:
  - D1.0, because repository-wide verification must be green before remaining product code lands.
- Out of scope:
  - Workflow transition timing, delivered by D1.1.
- Source refs:
  - PRD: §§4 and 6 transition requirements.
  - Architecture: §3.4.

#### D1.1: Replace fixed extraction stages with Project-owned Workflow stages

- Value: the existing Workflow entity can progress the complete closed Phase 13 stage language and return honest run state.
- Acceptance criteria:
  - The fixed extract/link/validate dialect is replaced by the six-variant union in `ARCH.md` §3.1.
  - Workflow owns active-plan derivation, progression, events, diagnostics, fail-fast state, and transition recording; Project owns stage behaviour and rollback.
  - Results include one initial snapshot and one full immutable accumulated-state snapshot after each completed active stage, including on a later failure.
  - `schema-validate` produces an unchanged state snapshot and a failed stage produces no completed-stage snapshot.
- Verification:
  - Exhaustive domain tests cover all variants, run modes, snapshot timing, immutability, and rollback.
  - The compiler rejects an unhandled stage member without a default branch or TypeScript `in` operator.
- Dependencies:
  - D1.0 and D1.2.
- Out of scope:
  - Stage-specific importer and AI behaviour.
- Source refs:
  - PRD: §§4 and 6.
  - Architecture: §§3.1 and 3.4.

#### D1.3: Replace duplicate Workflow extraction with shared Project extraction behaviour

- Value: direct and Workflow extraction have one deterministic behaviour and no retained compiler state across stages.
- Acceptance criteria:
  - Direct extraction and `code-extraction` invoke the same Project operation.
  - Workflow extraction composes earlier stage contributions while preserving same-stage duplicate failure and converting lenient incomplete state into Workflow diagnostics.
  - `LoadCodeExtraction` creates stage-scoped extraction state; no Project, Workflow, event, diagnostic, transition, or result retains its ts-morph Projects after the stage.
  - No graph-write port, Builder adapter, or fictional `dispose()` call exists.
- Verification:
  - Direct/single-stage output parity, duplicate, multiple-config, diagnostic, and five-stage retained-heap tests pass.
  - Existing direct extraction CLI integration tests pass unchanged.
- Dependencies:
  - D1.1 and D1.5.
- Out of scope:
  - Changes to extraction detection, metadata, or connection semantics.
- Source refs:
  - PRD: §§4 and 6 direct-extraction requirements.
  - Architecture: §§3.2 and 3.5.

#### D1.5: Replace the fixed Workflow dialect with strict file-addressed loading

- Value: users can address one portable Workflow file whose complete typed state is loaded before execution.
- Acceptance criteria:
  - Strict schemas cover `apiVersion: v1`, graph inputs, unique stage names, six typed stage configs, shared enum references, and empty-string rejection.
  - `RiviereProjectRepository.load(workflowPath)` resolves every path relative to its declaring file and returns a complete Project.
  - Shell-constructed ports are required repository constructor dependencies and are supplied to the aggregate, never passed to `load` or persisted.
  - `loadByWorkflowName` and the unpublished fixed dialect are removed; the other D1.0 access methods remain.
- Verification:
  - Schema and repository tests cover valid/invalid files, file-relative paths from different current directories, collaborator supply, prior-output rollback loading, and old-path removal.
  - `pnpm verify` passes.
- Dependencies:
  - D1.0 and D1.1.
- Out of scope:
  - Backward-compatible aliases or two coexisting Workflow formats.
- Source refs:
  - PRD: §4 Workflow/config requirements.
  - Architecture: §§3.1-3.3.

### M2: Deterministic source and validation stages work

#### D2.1: Add the EventCatalog import stage

- Value: EventCatalog facts can become authoritative graph contributions in the ordered Workflow.
- Acceptance criteria:
  - Strict importer and mapping configs load before aggregate construction.
  - One domain-port adapter over the isolated SDK client supplies records; Project behaviour owns canonical mapping and Builder mutation.
  - Domains, services, events, producers, and consumers map within the narrow documented scope.
  - Strict unmapped records fail; lenient records produce typed diagnostics/events.
- Verification:
  - Adapter, Project, schema, strict/lenient, canonical identity, overwrite, Link occurrence, and demo-fixture tests pass.
- Dependencies:
  - D0.2, D1.1, D1.2, and D1.5.
- Out of scope:
  - Fallback parsing, external participants, or broad EventCatalog semantics.
- Source refs:
  - PRD: §§4 and 6.
  - Architecture: §3.6.
  - Dogfooding: §3.1.

#### D2.2: Add the AsyncAPI import stage

- Value: AsyncAPI v3 publish/subscribe facts can contribute canonical events and async flows.
- Acceptance criteria:
  - Strict importer and mapping configs load before aggregate construction.
  - One domain-port adapter over the isolated parser client supplies a resolved document; Project behaviour owns supported-scope decisions and mutation.
  - Messages and send/receive operations map as documented; channels/servers are not components and request/reply fails explicitly.
- Verification:
  - Adapter, Project, schema, scope, unsupported-pattern, canonical identity, Link occurrence, and demo-fixture tests pass.
- Dependencies:
  - D0.2, D1.1, D1.2, and D1.5.
- Out of scope:
  - Request/reply, broker infrastructure modelling, or broader AsyncAPI semantics.
- Source refs:
  - PRD: §§4 and 6.
  - Architecture: §3.6.
  - Dogfooding: §3.1.

#### D2.3: Add non-mutating Workflow validation and compatibility checks

- Value: unsafe Workflow input fails before or at an explicit checkpoint without changing accumulated graph state.
- Acceptance criteria:
  - Complete structural/config/path/source/domain validation runs before execution.
  - `schema-validate` combines non-mutating Builder validation with unresolved Workflow diagnostics.
  - Final build remains mandatory even when no explicit validation stage exists.
  - The validate transition equals its preceding complete state, including diagnostics.
- Verification:
  - Tests cover compatible and incompatible sources/domains, unresolved diagnostics, invalid intermediate graphs, no mutation, and final build.
- Dependencies:
  - D1.1, D1.2, and D1.5.
- Out of scope:
  - Partial success or validation that repairs graph state.
- Source refs:
  - PRD: §§4 and 6.
  - Architecture: §§3.4 and 3.6.

### M3: Bounded additive AI stages work

#### D3.1: Add one shared AI CLI boundary

- Value: Riviere can validate and invoke any configured AI executable without an SDK or credential surface.
- Acceptance criteria:
  - One `AiCli` domain port exposes `checkAvailability(...)` and `run(...)`.
  - One adapter implements both operations over one generic child-process client using `spawn` with `shell: false`.
  - Normal runs check active commands; validate checks configured AI commands; `--skip-ai` and `--dry-run` perform no availability check.
  - Timeout, stdin or one `{prompt}` argument, bounded output, and strict failure results are covered.
- Verification:
  - Port-adapter tests use a mocked generic client; a stub executable integration test covers invocation and timeout.
  - Dependency assertions prove there is no AI SDK, dotenv load, or API-key handling.
- Dependencies:
  - D1.5.
- Out of scope:
  - Separate availability/execution ports, provider settings, retries, or secrets.
- Source refs:
  - PRD: §§4-6.
  - Architecture: §§3.2 and 3.7.

#### D3.2: Add bounded AI extraction

- Value: known deterministic gaps can be filled additively from bounded source context.
- Acceptance criteria:
  - Config supports the documented gap categories, allowed component types, source bounds, memory, prompt append, and add-component/add-Link outputs.
  - Prompt generation uses current readonly graph state and unresolved diagnostics.
  - Strict AI output is applied through typed upserts with `{ noOverwrite: true }`; existing deterministic scalars never change.
  - Batch overflow, malformed output, and unrequested additions fail the stage.
- Verification:
  - Tests cover every gap category, bounds, prompts, strict output, additive application, preserved scalars, diagnostics, and events.
- Dependencies:
  - D1.1, D1.2, D1.5, and D3.1.
- Out of scope:
  - Confidence scoring, threshold filtering, or full prompt replacement.
- Source refs:
  - PRD: §§4 and 6.
  - Architecture: §3.7.
  - Dogfooding: §3.2.

#### D3.3: Add additive AI enrichment

- Value: configured missing fields can be filled without changing any deterministic value.
- Acceptance criteria:
  - Config restricts component types, fields, sources, context bounds, memory, and prompt append.
  - Only unresolved/configured unset fields are requested.
  - Strict responses target existing canonical components and apply through `{ noOverwrite: true }`.
  - Existing scalars and unrelated fields remain byte-equivalent.
- Verification:
  - Tests cover selection, bounds, missing-field diagnostics, strict output, unknown targets, additive application, and preserved deterministic state.
- Dependencies:
  - D1.1, D1.2, D1.5, and D3.1. It may run in parallel with D3.2 after shared contracts stabilize.
- Out of scope:
  - Overwriting deterministic values or automated review/accept loops.
- Source refs:
  - PRD: §§4 and 6.
  - Architecture: §3.7.
  - Dogfooding: §3.2.

### M4: Customer CLI and guidance are complete

#### D4.1: Add file-addressed Workflow run and validate commands

- Value: users and CI have one non-interactive validate/run interface with actionable output and atomic persistence.
- Acceptance criteria:
  - Commands accept a Workflow path and preserve `repository.load(input.workflowPath)` then `project.rebuildGraph(input.mode)`.
  - `--skip-ai` and `--dry-run` derive the documented active plans.
  - Success atomically replaces the graph; failure retains prior graph and writes returned events to `workflow.log.ndjson`.
  - CLI summary renders returned stage timing, counts, warnings, diagnostics, output, and log paths without owning domain decisions.
- Verification:
  - CLI tests cover paths from different current directories, modes, failures, atomic replacement, logs, summaries, and no shell interactivity.
  - Generated CLI reference and workflow prompts are updated; `pnpm verify` passes.
- Dependencies:
  - D1.3, D2.1, D2.2, D2.3, D3.2, and D3.3.
- Out of scope:
  - CLI-owned stage loops, YAML parsing, or Builder construction.
- Source refs:
  - PRD: §§4 and 6.
  - Architecture: §§3.3 and 3.8.

#### D4.2: Add migration-safe greenfield Workflow initialization

- Value: new users can create a valid starter while existing extraction users receive a safe explicit migration path.
- Acceptance criteria:
  - `InitializeWorkflow` owns detection policy, no-write decision, generated templates, and persistence orchestration through generic filesystem clients.
  - Greenfield answers produce files that validate and run.
  - Any existing extraction config causes non-zero no-write refusal naming every detected path, the migration guide, and the approved assistant prompt.
  - Existing target files or a write failure leave no partial generated set.
- Verification:
  - Integration tests cover greenfield success, every config pattern, existing target files, rollback on write failure, exact guidance, and subsequent validate/run.
- Dependencies:
  - D1.5 and D2.3.
- Out of scope:
  - Automatic conversion, CLI-entrypoint filesystem policy, or a new aggregate.
- Source refs:
  - PRD: §§3-5.
  - Architecture: §3.8.

#### D4.3: Align architecture and operator documentation

- Value: contributors and users see the same Project-owned Workflow model and operating journey that the code implements.
- Acceptance criteria:
  - Architecture overview, ADR, glossary, importer/AI dependency docs, operator Workflow guide, manual migration guide, generated CLI reference, and affected Workflow prompts are updated.
  - Docs identify Project as sole aggregate, Workflow as entity, stages as values, one `AiCli` port, constructor dependency inversion, public transition results, and existing package ownership.
  - No dedicated Workflow package/runtime, AI SDK responsibility, automatic migration, or test-only observer is documented.
- Verification:
  - `pnpm lint:md`, documentation assertions, CLI doc generation checks, and `pnpm verify` pass.
- Dependencies:
  - D4.1 and D4.2; capability-specific docs may be drafted earlier but close only after both stabilize.
- Out of scope:
  - Future workflow extension or cross-repository orchestration docs.
- Source refs:
  - PRD: §§3-6.
  - Architecture: §§2, 3.9, and 6.

### M5: Executable demo and immutable customer gate are complete

#### D0.3: Add the executable ecommerce demo Workflow and transition fixtures

- Value: the separate demo becomes the first complete customer and provides exact stage-by-stage evidence.
- Acceptance criteria:
  - Every final file and path in `dogfooding.md` D0.3 exists in `ecommerce-demo-app`.
  - Fixture tooling serializes `WorkflowRunResult.transitions` into `00` through `06` and never accesses private Builder state.
  - Ground truth covers exact components, Link occurrences, selected scalar ownership, AI additions/enrichment, diagnostics, and events.
  - Existing direct extraction files, scripts, outputs, and README guidance remain intact; README adds the complete Workflow journey.
- Verification:
  - Validate and run the root Workflow, regenerate fixtures with a clean diff, compare validate before/after state, and rerun existing deterministic scripts.
- Dependencies:
  - D0.2, D3.2, D3.3, D4.1, and D4.2.
- Out of scope:
  - Final product-repository SHA pin, delivered by D0.4.
- Source refs:
  - PRD: §6.
  - Architecture: §§3.4 and 3.9.
  - Dogfooding: §3.2 D0.3.

#### D0.4: Pin and coordinate the ecommerce demo Workflow revision

- Value: product CI always executes an immutable compatible customer revision.
- Acceptance criteria:
  - `living-architecture` records one immutable demo SHA selected only after D0.3 passes.
  - CI clones exactly that revision; no demo source or fixture is copied into this repository.
  - Coordinated-update documentation defines demo merge, fixture regeneration, pin bump, and product gate order.
- Verification:
  - CI reports the checked-out SHA and fails for fixture/schema incompatibility or a floating ref.
- Dependencies:
  - D0.3 and D4.3.
- Out of scope:
  - Floating-branch integration.
- Source refs:
  - PRD: §6.
  - Architecture: §3.9.
  - Dogfooding: §3.3 D0.4.

#### D5.1: Verify the pinned demo Workflow against exact ground truth

- Value: the complete approved customer journey proves final graph and observability correctness.
- Acceptance criteria:
  - CI validates and runs the pinned Workflow and compares exact component IDs, internal Link occurrences, external Links, selected scalar ownership, diagnostics, and events.
  - Stage failure leaves the prior graph unchanged and returns actionable stage context.
  - Existing direct extraction verification passes at the same pinned revision.
- Verification:
  - Execute the commands and comparisons in `dogfooding.md` §3.4 against the pinned checkout.
- Dependencies:
  - D0.4.
- Out of scope:
  - AI-inclusive deterministic guarantees.
- Source refs:
  - PRD: §6.
  - Architecture: §§3.8-3.9.
  - Dogfooding: §3.4 D5.1.

#### D5.2: Enforce Workflow transitions and deterministic idempotency

- Value: CI identifies the exact stage that regressed and proves repeatable non-AI output.
- Acceptance criteria:
  - The public result's initial and six completed-stage states exactly match demo-owned fixtures.
  - Validate state equals its preceding state.
  - Two unchanged `--skip-ai` runs produce byte-identical canonically serialized graph output.
  - Fixture regeneration from a known-good result is byte-stable and never hand-edited.
- Verification:
  - Execute the transition comparisons and two commands in `dogfooding.md` §3.5 against the pinned checkout.
- Dependencies:
  - D0.4. It can run in parallel with D5.1 after the common pinned harness is stable.
- Out of scope:
  - AI-inclusive idempotency.
- Source refs:
  - PRD: §6.
  - Architecture: §§3.4 and 3.9.
  - Dogfooding: §3.5 D5.2.

## 3. Parallelisation

```yaml
tracks:
  - name: repository-rule-gate
    deliverables: [D1.0]
    can_run_in_parallel_with: [demo-source-groundwork]
    coordination_risk: D1.0 renames current repository methods and their callers
  - name: demo-source-groundwork
    deliverables: [D0.2]
    can_run_in_parallel_with: [repository-rule-gate, product-foundation]
    coordination_risk: final schemas may require coordinated fixture adjustments
  - name: product-foundation
    deliverables: [D1.2, D1.1, D1.5, D1.3]
    can_run_in_parallel_with: [demo-source-groundwork]
    coordination_risk: D1.1 and D1.5 both change Workflow published language and must follow their dependency order
  - name: deterministic-stages
    deliverables: [D2.1, D2.2, D2.3]
    can_run_in_parallel_with: [ai-stages]
    coordination_risk: stage result and diagnostic contracts must be stabilized by D1.1
  - name: ai-stages
    deliverables: [D3.1, D3.2, D3.3]
    can_run_in_parallel_with: [deterministic-stages]
    coordination_risk: D3.2 and D3.3 share strict AI contracts and the AiCli boundary
  - name: cli-and-guidance
    deliverables: [D4.1, D4.2, D4.3]
    can_run_in_parallel_with: [none]
    coordination_risk: operator docs close only after command protocols stabilize
  - name: customer-gate
    deliverables: [D0.3, D0.4, D5.1, D5.2]
    can_run_in_parallel_with: [none]
    coordination_risk: demo fixtures and immutable product pin require coordinated repositories
```

## 4. Dependencies

- Phase 12 Connection Detection is complete and remains the deterministic baseline.
- D1.0 is a gate for remaining `living-architecture` product changes, but does not block D0.2 in the separate demo repository.
- D1.2 precedes D1.1 because full snapshots require supported readonly Builder values.
- D1.1 precedes D1.5 because strict loading materialises the final closed stage language.
- D1.5 precedes stage-specific adapters and canonical CLI loading.
- D0.3 waits for executable product capabilities; D0.4 waits for approved generated fixtures.
- D5.1 and D5.2 run only against the immutable D0.4 revision.

## 5. Task creation readiness

- Deliverables concrete enough for issue creation: Yes
- Acceptance criteria observable: Yes
- Verification notes present where known: Yes
- PRD and architecture source refs present: Yes
- Dogfooding refs present for dogfooding deliverables: Yes
- Open blockers: None
