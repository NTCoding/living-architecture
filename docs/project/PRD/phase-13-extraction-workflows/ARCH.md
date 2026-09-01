# Architecture: Phase 13 Extraction Workflows

**Status:** Approved

---

## 1. Product feasibility check

The approved product is feasible within the existing Extraction subdomain. `RiviereProject` already owns graph-building behaviour and Workflow entities, `RiviereBuilder` already owns canonical graph construction, and the CLI already has an explicit composition root. Phase 13 extends these seams rather than introducing a second runtime. The EventCatalog SDK and AsyncAPI parser remain gated by focused capability tests, and AI integration requires only a generic child process.

## 2. Ownership and boundaries

### 2.1 Domain ownership

- `RiviereProject` remains the sole `aggregate` and owns one private `RiviereBuilder` plus its Workflow entities.
- `Workflow` remains an `aggregate-entity`. It owns identity, active-plan derivation, ordered progression, run state, fail-fast behaviour, diagnostics, events, and transition recording.
- `WorkflowStage` remains an immutable `value-object` represented by one closed discriminated union.
- `WorkflowRunEvent`, `WorkflowDiagnostic`, `WorkflowStateSnapshot`, and `WorkflowTransitionSnapshot` are honest value objects. Phase 13 does not relabel them as domain events merely because they describe occurrences.
- The Project owns stage domain behaviour, Builder mutation, canonical mappings, merge policy, validation decisions, and rollback.
- The Builder owns component identity, typed upserts, internal Link occurrence identity, external-Link deduplication, warnings, graph validation, and final graph construction.

### 2.2 Application and infrastructure ownership

- `RiviereProjectRepository` is the only aggregate-loading boundary. It parses persisted definitions, resolves file-relative paths, narrows configs, loads rollback state, and constructs a complete Project.
- The CLI shell constructs generic clients and domain-port adapters. It injects required collaborators into `RiviereProjectRepository`; the repository supplies them to every Project it constructs.
- Use-case commands preserve load-then-invoke call flows. They do not parse Workflow YAML, construct Builders, loop over stages, or import adapters.
- CLI entrypoints translate options, invoke one command use case, write returned output/logs, and present results. They do not load aggregates or own Workflow decisions.
- Vendor APIs stay in generic external clients. Domain-port adapters translate generic results into domain inputs without owning mapping or graph mutation.

### 2.3 Package boundary

```text
packages/riviere-extract-ts/domain-model/src/domain/
  riviere-project.ts
  workflow.ts
  workflow-stage.ts
  workflow-run-event.ts
  workflow-diagnostic.ts
  workflow-transition-snapshot.ts
  ports/
    ai-cli.ts
    load-asyncapi-document.ts
    load-code-extraction.ts
    load-eventcatalog-source.ts

packages/riviere-extract-ts/use-cases/src/features/extract/
  adapters/
  commands/
  data-access/riviere-project/

packages/riviere-extract-ts/use-cases/src/infra/external-clients/
  asyncapi/
  child-process/
  eventcatalog/
  filesystem/
  ts-morph/

apps/cli/src/features/extract/entrypoint/workflow/
```

No dedicated workflow package, workflow-runtime aggregate, graph-write port, Builder adapter, generic stage-handler registry, or intermediate graph format is introduced.

## 3. Component design

### 3.1 Closed Workflow language

```typescript
type WorkflowStageValue =
  | { kind: 'code-extraction'; name: string; config: CodeExtractionConfig }
  | { kind: 'eventcatalog-import'; name: string; config: EventCatalogImportConfig }
  | { kind: 'asyncapi-import'; name: string; config: AsyncApiImportConfig }
  | { kind: 'ai-extract'; name: string; config: AiExtractConfig }
  | { kind: 'ai-enrich'; name: string; config: AiEnrichConfig }
  | { kind: 'schema-validate'; name: string }
```

Every parser and consumer matches this union exhaustively. No TypeScript `in` operator, unchecked stage-kind string, default branch, handler map, or arbitrary command is permitted.

The file contract is strict and file-addressed:

```yaml
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
stages:
  - name: extract-code
    kind: code-extraction
    config: ./.riviere/config/extraction.config.json
  - name: validate
    kind: schema-validate
```

The repository resolves `output` and `stages[].config` relative to the Workflow file. Paths within a stage config resolve relative to that stage config. Shared published enums are referenced from their owning schema instead of copied into unchecked string lists.

### 3.2 Repository construction and dependency inversion

The shell owns concrete construction:

```typescript
const projectRepository = new RiviereProjectRepository({
  aiCli,
  loadAsyncApiDocument,
  loadCodeExtraction,
  loadEventCatalogSource,
})
```

These are required readonly constructor dependencies. The repository supplies them while constructing a Project:

```typescript
const project = RiviereProject.start(
  {
    graphDefinition,
    outputPath,
    previousGraph,
    workflow,
  },
  {
    aiCli: this.aiCli,
    loadAsyncApiDocument: this.loadAsyncApiDocument,
    loadCodeExtraction: this.loadCodeExtraction,
    loadEventCatalogSource: this.loadEventCatalogSource,
  },
)
```

Persisted state and runtime collaborators are separate. Ports are never load inputs, serialized fields, optional production dependencies, or no-op defaults. Tests supply explicit fakes.

### 3.3 Honest aggregate access patterns

The role-enforced lexical rule is `load` or `loadBy<AccessCriterion>`. The suffix must identify how the aggregate is found, not the operation that follows loading.

```typescript
class RiviereProjectRepository {
  loadByGraphPath(graphPath: string): RiviereProject
  loadByExtractionConfigPath(input: ExtractionConfigLoadInput): RiviereProject
  loadByDraftComponentsPath(input: DraftComponentsLoadInput): RiviereProject
  loadByWorkflowName(input: WorkflowNameLoadInput): RiviereProject
}
```

The role constraint is explicit and scoped to public methods whose return role is an allowed aggregate output:

```typescript
role('aggregate-repository', {
  allowedOutputs: ['aggregate'],
  outputMethodNameMatches: '^load(?:By[A-Z][A-Za-z0-9]*)?$',
})
```

D1.0 performs the current-state migration without aliases:

| Current call                                      | D1.0 replacement                     | Preserved behaviour                                                                 |
| ------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| `load(graphFileLocation)`                         | `loadByGraphPath(graphFileLocation)` | load an existing persisted graph                                                    |
| `load({ projectRoot, configPath, useTsConfig })`  | `loadByExtractionConfigPath(...)`    | load direct extraction state                                                        |
| `loadForEnrichment({ ..., draftComponentsPath })` | `loadByDraftComponentsPath(...)`     | load extraction state selected by persisted Draft Components path before enrichment |
| `loadWorkflow({ projectRoot, workflowName })`     | `loadByWorkflowName(...)`            | temporarily load the fixed name-addressed Workflow                                  |

D1.5 then replaces only the name-addressed Workflow path:

```typescript
const project = projectRepository.load(input.workflowPath)
const result = project.rebuildGraph(input.mode)
```

`load(workflowPath)` parses and validates the Workflow file, materialises typed stage values, loads a prior output graph only as rollback state, and returns one Project. It removes `loadByWorkflowName`; the graph, extraction-config, and Draft Components access methods remain. `loadByEnrichment` is forbidden because enrichment is behaviour, not an access criterion.

The role mechanism may enforce the method-name shape for public repository methods that return an aggregate. Documentation and review enforce semantic honesty. Persistence methods and private assembly helpers are outside this naming constraint.

### 3.4 Workflow execution and transition state

```typescript
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

type WorkflowRunResult =
  | Readonly<{
      success: true
      graph: RiviereGraph
      events: readonly WorkflowRunEvent[]
      transitions: readonly WorkflowTransitionSnapshot[]
    }>
  | Readonly<{
      success: false
      error: WorkflowFailure
      events: readonly WorkflowRunEvent[]
      transitions: readonly WorkflowTransitionSnapshot[]
    }>
```

The Project starts a fresh Builder and the Workflow records the initial state before its loop. After a stage succeeds and all its diagnostics/events are recorded, the Workflow appends one complete immutable accumulated-state snapshot. A failed stage does not append a completed-stage transition. On failure, the Project restores its previous Builder, but the returned transition values remain immutable evidence from the attempted run. `schema-validate` records a transition whose state equals the preceding state.

```typescript
const transitions = [project.initialWorkflowSnapshot()]
for (const stage of workflow.activeStages(mode)) {
  const result = executeStage(stage)
  if (!result.success) return workflow.fail(stage, result, transitions)
  workflow.recordSuccess(stage, result)
  transitions.push(project.completedStageSnapshot(stage))
}
return workflow.complete(transitions)
```

The aggregate obtains snapshot values through new readonly Builder methods:

```typescript
builder.components(): readonly Component[]
builder.links(): readonly Link[]
builder.externalLinks(): readonly ExternalLink[]
```

These methods return immutable snapshots, not mutable internal collections and not a completed `RiviereQuery`. Builder remains a mutable `value-object`; mutability does not create identity.

### 3.5 Code extraction parity and resource lifecycle

Direct extraction and a `code-extraction` Workflow stage invoke the same Project extraction behaviour. Same-stage duplicate emission still fails; only earlier completed stage contributions compose through typed Builder upserts.

Workflow definitions retain validated extraction instructions, not ts-morph `Project` instances. The constructor-injected `LoadCodeExtraction` port and its adapter create the stage-scoped `ExtractionConfiguration` and ts-morph Projects immediately before Project extraction behaviour runs:

```typescript
private executeCodeExtraction(stage: CodeExtractionStage): StageExecutionResult {
  const extraction = this.loadCodeExtraction(stage.config)
  return this.extractFrom(extraction)
}
```

`extractFrom(...)` receives the stage-scoped configuration as an argument and does not assign it, its module contexts, or ts-morph Projects to aggregate fields. After the call returns, no Workflow stage, Project field, event, diagnostic, result, or transition retains those objects. Repeated-stage tests prove bounded retained heap. No design or test requires a fictional ts-morph `dispose()` API.

### 3.6 Deterministic importer and validation stages

```yaml
# eventcatalog-import.yaml
source: ./eventcatalog
mappings: ./eventcatalog-mappings.yaml
allow-unmapped: false
```

```yaml
# asyncapi-import.yaml
source: ./asyncapi.yaml
mappings: ./asyncapi-mappings.yaml
allow-unmapped: false
```

The generic EventCatalog client imports only `@eventcatalog/sdk`; the generic AsyncAPI client imports only `@asyncapi/parser`. Their adapters implement the Project's ports. Project behaviour maps external records to canonical identities and mutates the Builder. Strict mode fails on unmapped records; lenient mode skips and records typed diagnostics/events.

`schema-validate` calls non-mutating `builder.validate()`, combines that result with unresolved Workflow diagnostics, and fails without changing Builder or diagnostic state. Final successful output still requires `builder.build()`.

### 3.7 One AI CLI capability

```typescript
interface AiCli {
  checkAvailability(command: string): AiCliAvailability
  run(input: RunAiCliInput): RunAiCliResult
}
```

One domain-port adapter implements both operations over one generic child-process client using `spawn` with `shell: false`. It inherits the current process environment without loading dotenv or handling credentials. `run(...)` accepts the configured command, args, prompt, and timeout; it passes the prompt on stdin unless one `{prompt}` placeholder is configured, captures bounded output, and kills timed-out processes.

`workflow validate` calls `checkAvailability(...)` for each configured AI stage. A normal run checks only the active AI command immediately before invocation. `--skip-ai` and `--dry-run` do not check availability because no process is invoked. All modes still parse and validate AI config structure and referenced files.

```yaml
command: claude
args: ['-p']
timeout-seconds: 600
sources:
  - ../orders-domain/src
selection:
  from: [uncertain-links, missing-events]
  component-types: [Event, EventHandler, UseCase, DomainOp]
outputs:
  add-components: true
  add-links: true
```

AI responses are strict published JSON shapes. Project behaviour applies typed upserts with `{ noOverwrite: true }`. Overflow, malformed output, unrequested fields, or unknown canonical targets fail the stage. No AI SDK, provider model, API key, retry policy, token accounting, or credential handling enters Riviere.

### 3.8 CLI commands and persistence

```text
riviere workflow validate <workflow-path>
riviere workflow run <workflow-path> [--skip-ai] [--dry-run]
riviere workflow init [directory]
```

`RunWorkflow` and `ValidateWorkflow` each receive a typed file path and preserve the repository/aggregate boundary. The CLI writes returned events as NDJSON beside the configured output. It atomically replaces the graph only when `result.success` is true.

Greenfield initialization is an application command, not aggregate loading and not CLI-entrypoint logic. `InitializeWorkflow` owns the no-write decision and template selection. It depends on generic injected filesystem client operations for file discovery and atomic writes:

```typescript
const result = initializeWorkflow.execute({ targetDirectory })
```

```typescript
class InitializeWorkflow {
  constructor(
    private readonly findFiles: FindFiles,
    private readonly writeFilesAtomically: WriteFilesAtomically,
  ) {}

  execute(input: InitializeWorkflowInput): InitializeWorkflowResult {
    const existingConfigs = this.findFiles(input.targetDirectory, extractionConfigPatterns)
    if (existingConfigs.length > 0) return existingConfigRefusal(existingConfigs)
    return this.writeFilesAtomically(greenfieldWorkflowFiles(input.targetDirectory))
  }
}
```

`FindFiles` and `WriteFilesAtomically` are generic `external-client-service` functions under use-case infrastructure; they know filesystem operations but not migration policy or Workflow semantics. The CLI entrypoint only collects answers, calls `InitializeWorkflow.execute(...)`, and presents its typed result. If any configured target already exists or any write fails, the operation leaves no generated file set behind. Existing extraction configs cause a refusal that names every detected path, points to `docs/workflow/migrating-from-extract.md`, and includes the approved assistant migration prompt.

### 3.9 Documentation and demo coordination

Architecture documentation must identify the sole aggregate and existing package ownership. Operator documentation covers workflow authoring, run modes, diagnostics, AI CLI responsibility, and manual migration. Generated CLI reference is regenerated after command changes.

The demo repository owns all customer source, specs, configs, ground truth, transition fixtures, and regeneration tooling. `living-architecture` stores only an immutable approved demo SHA and clones that revision for integration tests.

```text
ecommerce-demo-app/
  riviere-workflow.yaml
  specs/eventcatalog/
  specs/eventcatalog-import.yaml
  specs/eventcatalog-mappings.yaml
  specs/asyncapi.yaml
  specs/asyncapi-import.yaml
  specs/asyncapi-mappings.yaml
  stages/ai-extract.yaml
  stages/ai-enrich.yaml
  tests/workflow-ground-truth.json
  tests/workflow-transitions/00-initial.json
  tests/workflow-transitions/01-after-extract-code.json
  tests/workflow-transitions/02-after-import-eventcatalog.json
  tests/workflow-transitions/03-after-import-asyncapi.json
  tests/workflow-transitions/04-after-discover-gaps.json
  tests/workflow-transitions/05-after-enrich-metadata.json
  tests/workflow-transitions/06-after-validate.json
```

Demo tooling serializes only `WorkflowRunResult.transitions`. It never reads private Builder state or installs a test-only observer.

### 3.10 Role and location decisions

| Proposed Element                                        | Kind              | Role                      | Sublocation                                           | Confidence | Notes                                          |
| ------------------------------------------------------- | ----------------- | ------------------------- | ----------------------------------------------------- | ---------- | ---------------------------------------------- |
| `RiviereProject`                                        | class             | `aggregate`               | domain-model `domain/`                                | High       | Sole aggregate                                 |
| `Workflow`                                              | class             | `aggregate-entity`        | domain-model `domain/`                                | High       | Owns process lifecycle inside Project          |
| `WorkflowStage`                                         | class/type        | `value-object`            | domain-model `domain/`                                | High       | Closed immutable discriminated union           |
| `WorkflowTransitionSnapshot`                            | type alias        | `value-object`            | domain-model `domain/`                                | High       | Immutable accumulated state                    |
| `WorkflowRunEvent`                                      | type/class        | `value-object`            | domain-model `domain/`                                | High       | Honest current role; no relabelling            |
| `AiCli`                                                 | interface         | `domain-port`             | domain-model `domain/ports/`                          | High       | One cohesive availability/execution capability |
| `LoadCodeExtraction`                                    | type alias        | `domain-port`             | domain-model `domain/ports/`                          | High       | Creates stage-scoped extraction state          |
| `RiviereProjectRepository`                              | class             | `aggregate-repository`    | use-cases `data-access/riviere-project/`              | High       | Loads complete Projects and injects ports      |
| `RoleConstraints.outputMethodNameMatches`               | data member       | owned by `value-object`   | role-enforcement domain `role-constraints.ts`         | High       | Carries the public output-method regex         |
| `BuiltRole.outputMethodNameMatches`                     | data member       | owned by `value-object`   | role-enforcement domain `role-enforcement-builder.ts` | High       | Projects the regex to plugin configuration     |
| `EventCatalogSourceAdapter`                             | function/class    | `domain-port-adapter`     | use-cases `features/extract/adapters/`                | High       | Implements `LoadEventCatalogSource`            |
| `AsyncApiDocumentAdapter`                               | function/class    | `domain-port-adapter`     | use-cases `features/extract/adapters/`                | High       | Implements `LoadAsyncApiDocument`              |
| `AiCliAdapter`                                          | function/class    | `domain-port-adapter`     | use-cases `features/extract/adapters/`                | High       | Implements both `AiCli` operations             |
| SDK/parser/process/filesystem clients                   | functions/classes | `external-client-service` | use-cases `infra/external-clients/`                   | High       | No domain decisions                            |
| `RunWorkflow`, `ValidateWorkflow`, `InitializeWorkflow` | classes           | `command-use-case`        | use-cases `features/extract/commands/`                | High       | One public `execute` method each               |
| workflow CLI entrypoints                                | functions         | `cli-entrypoint`          | app feature `entrypoint/workflow/`                    | High       | Translate, invoke, present                     |

Canonical pattern: existing aggregate + aggregate repository + command use case + domain ports/adapters + generic external clients. No new role or aggregate is required.

## 4. Feasibility confirmations

- Builder readonly views can return immutable copies without introducing `RiviereQuery` or exposing mutable collections.
- Full transition snapshots are deliberately accepted as production result values despite memory cost.
- Existing role enforcement can be extended to inspect public aggregate-returning repository methods; documentation carries the semantic access-criterion requirement that lexical checking cannot prove.
- Stage-scoped extraction state can be passed to shared Project behaviour and released by reference lifetime; ts-morph has no required `dispose()` method.
- EventCatalog and AsyncAPI remain capability-gated. If the selected library cannot supply required Phase 13 facts, the corresponding delivery stops rather than adding a second parser.
- One child-process client can implement AI availability and invocation without an SDK or secret surface.

## 5. Product impact notes

No product-impact changes identified. These decisions implement the approved product requirements and correct unsupported technical mechanisms in the consolidated reference.

## 6. Task generation consequences

- Every replacement issue must include current and target calls, a complete replacement matrix, loading inputs and outputs, and removal of the old path without compatibility aliases.
- Repository naming work must use honest criteria: graph path, extraction config path, Draft Components path, temporary Workflow name, then canonical Workflow path.
- Every Project-construction issue must show shell construction, repository constructor injection, and repository-to-aggregate collaborator supply. Ports are never load inputs.
- Transition work must return full immutable state on the production result. Test observers and private Builder fixture hooks are forbidden.
- AI work implements one `AiCli` port and one adapter, not separate availability and execution ports.
- Extraction parity work must remove retained references to stage-scoped ts-morph state and must not assert fictional disposal.
- Workflow initialization belongs to `InitializeWorkflow` plus generic filesystem clients, not Commander entrypoint logic and not a new aggregate.
- Demo issues must copy exact final artefacts from `dogfooding.md`; customer fixtures stay in the demo repository.
- Documentation must describe existing package ownership and the sole aggregate; it must not invent a dedicated workflow package.
- If implementation reveals this design is impractical or incomplete, stop and seek approval rather than silently implementing a different boundary.
