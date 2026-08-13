# Delivery Plan: Riviere Extraction Workflows V1

**Status:** Approved

---

## 1. Delivery summary

Delivery is serial because the approved architecture makes fundamental model changes. Going parallel while retiring `ExtractionProject`, introducing `RiviereProject`, and changing extraction-stage execution would create coordination risk rather than delivery speed.

The delivery sequence first introduces the package-owned extraction model and replaces the old extraction aggregate path, then introduces workflow loading, in-memory graph rebuild execution, CLI-boundary run/log/graph output, and finally `ecommerce-demo-app` dogfooding through real workflow files, package scripts, success/failure verifiers, CI, and README updates.

## 2. Milestones and deliverables

### M1: Retire `ExtractionProject`

#### D1.1: Introduce the approved extraction-stage/service model

- Value: Extraction behaviour needed by extract commands and workflows exists through the approved package-owned extraction concepts.
- Acceptance criteria:
  - `ExtractionStage` exists as the approved data-only value object at `packages/riviere-extract-ts/src/domain/extraction-stage.ts`.
  - `ExtractionStage` carries the approved extraction state: `name`, `configPath`, `useTsConfig`, `repositoryName`, `resolvedConfig`, and `moduleContexts`.
  - `ExtractComponentsForGraph` exists as the approved domain service for graph-ready components before connection detection.
  - `DetectExtractionConnections` exists as the approved domain service for connection detection.
  - Workflow code does not own extraction rules, linking rules, custom type rules, or extraction result semantics.
  - Workflow files and workflow CLI options do not introduce `allowIncomplete` or other extraction semantics switches.
- Verification:
  - Reviewer inspection confirms only the approved extraction concepts are introduced for this model change.
  - Tests cover graph-ready extraction before connection detection and separate connection detection; no exact command was named in the approved PRD or architecture.
- Dependencies:
  - None.
- Out of scope:
  - Workflow execution.
- Source refs:
  - PRD: Sections 4, 5, 6.
  - Architecture: Section 3, concrete extraction seam required by all options; required extraction and graph-application split.

#### D1.2: Replace the old extraction aggregate path with `RiviereProject`

- Value: Existing extract command behaviour continues through the new extraction-package aggregate instead of the old CLI-owned `ExtractionProject` model.
- Acceptance criteria:
  - `RiviereProject` exists as the approved aggregate at `packages/riviere-extract-ts/src/domain/riviere-project.ts`.
  - `RiviereProjectRepository` exists as the shared aggregate repository at `packages/riviere-cli/src/data-access/riviere-project/riviere-project-repository.ts`.
  - `ExtractionProject` no longer exists.
  - `ExtractionProjectRepository` no longer exists.
  - Existing extract command behaviour still works after the replacement.
  - Existing extract commands no longer import or depend on `ExtractionProject` or `ExtractionProjectRepository`.
  - `ExtractDraftComponents` replaces `ExtractionProjectRepository.loadFromChangedProject/loadFromSelectedFiles/loadFromFullProject(...)` with `RiviereProjectRepository.load({ projectRoot, configPath, useTsConfig })` followed by `RiviereProject.extractDraftComponents({ sourceFileSelection, allowIncomplete, includeConnections })`.
  - `EnrichDraftComponents` replaces `ExtractionProjectRepository.loadFromDraftEnrichment({ configPath, draftComponentsPath, useTsConfig })` with `RiviereProjectRepository.load({ projectRoot, configPath, useTsConfig })` followed by `RiviereProject.enrichDraftComponents({ draftComponents, allowIncomplete, includeConnections })`.
  - `RiviereProjectRepository` loads the full aggregate state for the resolved extraction config, including expanded module `$ref` entries, resolved module `extends`, repository name, all files matched by config modules, `ts-morph` projects, and `ExtractionStage` value objects.
  - `RiviereProjectRepository` does not accept `sourceMode`, selected files, changed-file mode, draft components, `includeConnections`, or `allowIncomplete`.
  - `sourceMode` remains CLI/input-validation context and is translated before the aggregate operation is called.
  - `draftComponentsPath` is not a repository input; draft components are loaded before calling `RiviereProject.enrichDraftComponents(...)`.
  - `ExtractionProject` is removed from approved aggregate role instances.
  - No new roles are invented.
  - No alternative persistence concepts are added, including `ExtractionStageRepository`, a generic loader/materialiser, or a config-resolution service pretending to be architecture.
- Verification:
  - Reviewer inspection confirms `ExtractionProject` and `ExtractionProjectRepository` are gone and no extract command imports them.
  - Reviewer inspection confirms existing extract commands use the exact replacement loading and operation flow above.
  - Existing extract command tests continue to pass; no exact command was named in the approved PRD or architecture.
- Dependencies:
  - D1.1.
- Out of scope:
  - Workflow file loading and workflow execution.
- Source refs:
  - PRD: Sections 4, 5, 6.
  - Architecture: Sections 3, 6; Option 1 component design; extraction command replacement flow; required role/config changes selected by Option 1.

### M2: Introduce `RiviereProject` workflow loading

#### D2.1: Load a named workflow as a `RiviereProject`

- Value: A project-local workflow file becomes a concrete aggregate that can rebuild one graph.
- Acceptance criteria:
  - `RiviereProject` exists as the approved aggregate at `packages/riviere-extract-ts/src/domain/riviere-project.ts`.
  - `RiviereProjectRepository` exists as the shared aggregate repository at `packages/riviere-cli/src/data-access/riviere-project/riviere-project-repository.ts`.
  - `RiviereProjectRepository.load({ projectRoot, workflowName })` loads `.riviere/workflows/{workflowName}.yaml`.
  - Workflow names match the approved V1 format: `[a-z0-9][a-z0-9-]*`.
  - The repository reads required `graph.sources`, `graph.domains`, `graph.outputPath`, and `runLog.directory`.
  - The repository materialises `ExtractionStage` value objects while loading `RiviereProject`.
  - The repository does not run workflow stages.
  - The repository does not accept operation inputs while loading a workflow project.
  - `RunWorkflow` loads `RiviereProject` and calls `rebuildGraph()`; it does not contain the stage loop.
- Verification:
  - Reviewer inspection confirms workflow loading returns a `RiviereProject` and does not execute stages.
  - Tests cover named workflow loading from `.riviere/workflows/{workflowName}.yaml`; no exact command was named in the approved PRD or architecture.
- Dependencies:
  - M1.
- Out of scope:
  - Running workflow stages.
- Source refs:
  - PRD: Sections 3, 4, 6.
  - Architecture: Sections 2, 3, 6; Option 1 ownership and boundaries; stage materialisation and execution mechanics.

#### D2.2: Reject invalid workflows before stages run

- Value: Broken workflow definitions fail safely before graph-building starts.
- Acceptance criteria:
  - Missing workflow file fails before stages run.
  - Invalid YAML fails before stages run.
  - Unsupported `version` fails before stages run.
  - Missing `graph.sources`, `graph.domains`, `graph.outputPath`, or `runLog.directory` fails before stages run.
  - Unknown stage type fails before stages run.
  - Duplicate stage name fails before stages run.
  - Missing extract `config` fails before stages run.
  - Invalid stage order fails before stages run.
  - Multiple `link` stages fail before stages run.
  - Missing `link` fails before stages run.
  - Missing `validate` fails before stages run.
  - No arbitrary shell-command or non-Rivière stage is accepted.
  - Failed workflow validation leaves the graph unchanged.
- Verification:
  - Tests cover each invalid workflow case and confirm no stages run; no exact command was named in the approved PRD or architecture.
- Dependencies:
  - D2.1.
- Out of scope:
  - Plan-first/preview mode.
- Source refs:
  - PRD: Sections 4, 5, 6.
  - Architecture: Section 3, workflow schema validation; V1 domain stage grammar.

### M3: Rebuild one graph in memory

#### D3.1: `RiviereProject.rebuildGraph()` starts from an empty graph

- Value: Every workflow run rebuilds one graph from a clean state.
- Acceptance criteria:
  - `RiviereProject.rebuildGraph()` creates a fresh `RiviereBuilder` internally.
  - The use case does not pass a builder into `RiviereProject`.
  - A workflow run starts from an empty graph state.
  - The final graph artefact is returned only after all stages succeed.
  - `RiviereProject` does not write the graph file.
- Verification:
  - Tests confirm each rebuild starts from a fresh in-memory builder and returns no graph artefact on failure; no exact command was named in the approved PRD or architecture.
- Dependencies:
  - M1.
  - M2.
- Out of scope:
  - Starting from an existing graph.
- Source refs:
  - PRD: Sections 2, 4, 5, 6.
  - Architecture: Sections 1, 3; `RiviereProject` aggregate; runtime call outline.

#### D3.2: Run extract, link, and validate against one accumulated graph

- Value: The approved `extract → link → validate` journey produces one coherent graph-building run.
- Acceptance criteria:
  - One or more extract stages run before the link stage.
  - Each extract stage calls `ExtractComponentsForGraph` with strict V1 extraction.
  - Extracted graph-ready components are accumulated for the workflow run.
  - The link stage runs only against extraction stages that have executed in the current run.
  - Connection detection uses the accumulated graph-ready components.
  - The validate stage calls `builder.validate()` before final graph build.
  - Any stage failure aborts immediately.
  - Later stages do not run after a failure.
- Verification:
  - Tests cover ordered extract, link, validate execution, accumulated components, and fail-fast behaviour; no exact command was named in the approved PRD or architecture.
- Dependencies:
  - D3.1.
  - D1.2.
  - D2.1.
- Out of scope:
  - `enrich` as a first-class workflow stage.
  - AI-assisted stages.
- Source refs:
  - PRD: Sections 2, 4, 5, 6.
  - Architecture: Sections 3, 4, 6; stage materialisation and execution mechanics.

#### D3.3: Apply extraction output through `ApplyExtractionToGraph`

- Value: Extraction output becomes graph state through explicit approved builder operations.
- Acceptance criteria:
  - `ApplyExtractionToGraph` exists in workflow domain.
  - Components are applied through real `RiviereBuilder` methods, including `upsertApi`, `upsertUseCase`, `upsertDomainOp`, `upsertEvent`, `upsertEventHandler`, `upsertUI`, and `upsertCustom`.
  - Links are applied through real builder link methods.
  - Required graph fields are validated before builder calls.
  - Source repository information from extraction is preserved in graph source locations.
  - `ApplyExtractionToGraph` is not moved to builder, extraction, infra mapping, or CLI output.
- Verification:
  - Tests cover component application, link application, required field failures, and repository preservation; no exact command was named in the approved PRD or architecture.
- Dependencies:
  - D1.2.
  - D3.1.
- Out of scope:
  - Generic graph mapping utilities.
- Source refs:
  - Architecture: Section 3; `ApplyExtractionToGraph`; architecture approval disposition.

### M4: Run workflows through the CLI boundary

#### D4.1: Add the named workflow run command

- Value: Users can run a project-local workflow repeatedly from the CLI.
- Acceptance criteria:
  - The workflow CLI entrypoint exists.
  - `createRunWorkflowInput` converts parsed CLI options into typed workflow input.
  - `RunWorkflow` loads the project and invokes `RiviereProject.rebuildGraph()`.
  - The command runs a named workflow inside a project.
  - The command does not support arbitrary shell stages or generic task-runner behaviour.
- Verification:
  - CLI tests cover running a named workflow and rejecting generic task-runner behaviour; no exact command was named in the approved PRD or architecture.
- Dependencies:
  - M2.
  - M3.
- Out of scope:
  - Generic task-runner features.
- Source refs:
  - PRD: Sections 3, 4, 5, 6.
  - Architecture: Sections 2, 3, 6; runtime call outline.

#### D4.2: Write NDJSON run logs for success and failure

- Value: Users can inspect what happened during a workflow run.
- Acceptance criteria:
  - Each run creates one NDJSON run log.
  - Each log line is one JSON object.
  - Each event includes at least `type`, `timestamp`, `runId`, `workflowName`, and `level`.
  - Required event types are emitted: `WorkflowStarted`, `WorkflowValidationFailed`, `StageStarted`, `StageCompleted`, `StageFailed`, `GraphWriteStarted`, `GraphWriteCompleted`, `WorkflowCompleted`, and `WorkflowFailed`.
  - Stage events include `stageName`, `stageType`, and `stageIndex`.
  - Failure events include `reason`, `errorCode`, and relevant `configPath` or `outputPath`.
  - Logs are written for successful runs, validation failures, referenced config failures, extraction failures, stage failures, graph write failures, and completed failures.
  - If the log cannot be created before stages run, the command fails before extraction.
- Verification:
  - Tests inspect NDJSON output for required event fields, event types, success logs, and failure logs; no exact command was named in the approved PRD or architecture.
- Dependencies:
  - D4.1.
- Out of scope:
  - CI-specific observability, annotations, job summaries, or reporting.
- Source refs:
  - PRD: Sections 2, 4, 5, 6.
  - Architecture: Section 3, run log semantics.

#### D4.3: Write the final graph only after success

- Value: Failed workflow runs never corrupt or replace the previous graph.
- Acceptance criteria:
  - Successful runs write the final graph after all stages succeed.
  - Failed runs do not write graph output.
  - Failed runs leave the previous final graph unchanged.
  - Graph writing uses temp-file plus rename behaviour.
  - Graph write failure emits failure log events.
  - CLI-boundary graph and run-log writing lives under `packages/riviere-cli/src/features/workflow/entrypoint/run-workflow/`.
  - No graph-output or run-log writer is added under `features/workflow/data-access/`; those files implement CLI output policy, not loading or saving a domain model.
  - Workflow presentation/output is not added under the older `infra/cli/output` pattern.
- Verification:
  - Tests confirm success writes the final graph, failures leave the previous graph unchanged, graph write failures are logged, and presentation/output lives in the approved entrypoint-local path; no exact command was named in the approved PRD or architecture.
- Dependencies:
  - D4.1.
  - D4.2.
- Out of scope:
  - Graph writing from `RiviereProject` or `RunWorkflow`.
- Source refs:
  - PRD: Sections 2, 4, 5, 6.
  - Architecture: Sections 3, 6; run log semantics; task generation consequences.

### M5: Prove the workflow in `ecommerce-demo-app`

#### D5.1: Add V1 workflow definitions to `ecommerce-demo-app`

- Value: The workflow capability is dogfooded through committed project-local workflow files that cover positive, modular, CI, and failure journeys.
- Acceptance criteria:
  - `../ecommerce-demo-app/.riviere/workflows/combined-config.yaml` exists exactly as specified in `dogfooding.md` section 3.1.
  - `../ecommerce-demo-app/.riviere/workflows/modular-config.yaml` exists exactly as specified in `dogfooding.md` section 3.1.
  - `../ecommerce-demo-app/.riviere/workflows/ci-check.yaml` exists exactly as specified in `dogfooding.md` section 3.1.
  - `../ecommerce-demo-app/.riviere/workflows/failure-workflow.yaml` exists exactly as specified in `dogfooding.md` section 3.1.
  - Combined and CI workflows use `.riviere/config/extraction.config.json` for extraction and linking.
  - Modular workflow uses separate module extraction configs and `.riviere/config/extraction.config.json` for linking.
  - Failure workflow references `.riviere/config/__missing-dogfood-config.json` and writes to `.riviere/graph.json` only as a negative all-or-nothing scenario.
  - All positive workflows include `extract`, `link`, and `validate`; no workflow embeds arbitrary shell commands.
- Verification:
  - Reviewer inspection confirms each workflow file matches the exact YAML in `dogfooding.md` section 3.1.
- Dependencies:
  - M4.
- Out of scope:
  - BFF-only smoke workflow.
  - Single-domain smoke workflow.
  - Expected-output fixture verification inside product workflow execution.
- Source refs:
  - PRD: Sections 2, 3, 4, 5, 6.
  - Architecture: Section 6, task generation consequences.
  - Dogfooding: Sections 1, 2, 3.1, 3.7.

#### D5.2: Add package scripts for workflow dogfooding

- Value: Maintainers can run the workflow dogfooding journey through normal project commands.
- Acceptance criteria:
  - `../ecommerce-demo-app/package.json` contains `workflow:combined` exactly as specified in `dogfooding.md` section 3.2.
  - `../ecommerce-demo-app/package.json` contains `workflow:modular` exactly as specified in `dogfooding.md` section 3.2.
  - `../ecommerce-demo-app/package.json` contains `workflow:ci-check` exactly as specified in `dogfooding.md` section 3.2.
  - `../ecommerce-demo-app/package.json` contains `verify:workflow:combined`, `verify:workflow:modular`, `verify:workflow:ci-check`, `verify:workflow:failure`, and `dogfood:workflow` exactly as specified in `dogfooding.md` section 3.2.
  - Scripts call Rivière as normal project commands and do not embed shell commands inside workflow files.
- Verification:
  - Reviewer inspection confirms package scripts match `dogfooding.md` section 3.2.
- Dependencies:
  - D5.1.
- Out of scope:
  - Changing existing `extract`, `verify:extract`, `verify:connections`, or `test:extract` scripts.
- Source refs:
  - PRD: Sections 2, 4, 5, 6.
  - Dogfooding: Sections 3.2, 3.7.

#### D5.3: Add workflow success verifier

- Value: Successful workflow runs are checked from the user's point of view rather than only by fixture comparison.
- Acceptance criteria:
  - `../ecommerce-demo-app/scripts/verify-workflow.mjs` exists.
  - The verifier accepts `node scripts/verify-workflow.mjs <workflow-name> <graph-output-path>`.
  - The verifier checks the graph output path exists and parses as JSON.
  - The verifier checks graph output has non-empty `components` and `links` arrays.
  - The verifier checks graph output contains representative coverage for orders, shipping, inventory, payment, notifications, BFF, and UI as specified in `dogfooding.md` section 3.3.
  - The verifier checks the latest run log exists under `.riviere/logs/workflows/<workflow-name>/`.
  - The verifier checks the run log is valid NDJSON and includes required fields and success lifecycle events from `dogfooding.md` section 3.3.
  - The verifier does not compare workflow run logs to old extraction expected-output fixtures.
  - Existing `verify:extract` and `verify:connections` scripts remain separate.
- Verification:
  - Reviewer inspection confirms `verify-workflow.mjs` implements every required check in `dogfooding.md` section 3.3.
- Dependencies:
  - D5.1.
  - D5.2.
- Out of scope:
  - Moving expected-output fixture verification into product workflow execution.
- Source refs:
  - PRD: Sections 2, 4, 5, 6.
  - Dogfooding: Sections 3.3, 3.7.

#### D5.4: Add all-or-nothing failure verifier

- Value: The dogfood protects the trust promise that a failed workflow leaves the previous graph unchanged and produces a useful log.
- Acceptance criteria:
  - `../ecommerce-demo-app/scripts/verify-workflow-failure.mjs` exists.
  - The verifier reads `.riviere/graph.json` before running the negative workflow.
  - The verifier runs `npx riviere workflow run .riviere/workflows/failure-workflow.yaml` and expects a non-zero exit.
  - The verifier asserts `.riviere/graph.json` is byte-for-byte unchanged after the failed run.
  - The verifier asserts a failed-run log exists.
  - The verifier asserts the failed-run log includes `WorkflowFailed` or `WorkflowValidationFailed`, includes the missing config path where available, and does not include `GraphWriteCompleted`.
  - The verifier asserts the failed-run log is valid NDJSON and includes standard event fields.
- Verification:
  - Reviewer inspection confirms `verify-workflow-failure.mjs` implements every required check in `dogfooding.md` section 3.4.
- Dependencies:
  - D5.1.
  - D5.2.
- Out of scope:
  - Product-level CI-specific failure reporting.
- Source refs:
  - PRD: Sections 2, 4, 5, 6.
  - Architecture: all-or-nothing graph integrity requirements.
  - Dogfooding: Sections 3.4, 3.7.

#### D5.5: Run workflow dogfooding in CI

- Value: Rivière learns from real automated usage without adding CI-specific product behaviour.
- Acceptance criteria:
  - `../ecommerce-demo-app/.github/workflows/architecture.yml` runs `pnpm dogfood:workflow` after existing extraction and connection verification steps.
  - CI continues to run `verify:extract` and `verify:connections` separately.
  - CI calls workflows as normal project commands.
  - CI does not require workflow-specific annotations, job summaries, reporting, or observability behaviour.
  - A failed workflow command fails CI normally.
- Verification:
  - CI configuration review confirms the workflow dogfooding step matches `dogfooding.md` section 3.5.
- Dependencies:
  - D5.2.
  - D5.3.
  - D5.4.
- Out of scope:
  - CI-specific product behaviour, reporting, annotations, job summaries, or observability strategy.
- Source refs:
  - PRD: Sections 2, 4, 5, 6.
  - Dogfooding: Sections 3.5, 3.7.

#### D5.6: Update `ecommerce-demo-app` README for workflow dogfooding

- Value: A user can understand and run the new workflow dogfooding journey from the demo app documentation.
- Acceptance criteria:
  - README lists `npm run workflow:combined`, `npm run workflow:modular`, `npm run workflow:ci-check`, and `npm run dogfood:workflow` in the install/verify command list.
  - README explains `.riviere/workflows/combined-config.yaml`, `.riviere/workflows/modular-config.yaml`, `.riviere/workflows/ci-check.yaml`, and `.riviere/workflows/failure-workflow.yaml` as V1 project-local workflow examples.
  - README explains positive workflows start from an empty graph state and write graph output only after `extract -> link -> validate` succeeds.
  - README explains link stages reference `.riviere/config/extraction.config.json` because connection/linking rules belong in Rivière config.
  - README explains run logs are written under `.riviere/logs/workflows/<workflow-name>/{runId}.ndjson`.
  - README clarifies `expected-extraction-output.json` and `expected-connections.json` remain verification fixtures, not product workflow inputs.
  - README clarifies Rivière workflows are Rivière-only; shell/npm/CI can call Rivière, but arbitrary shell commands do not live inside workflow files.
- Verification:
  - README review confirms every required addition from `dogfooding.md` section 3.6 is present.
- Dependencies:
  - D5.1.
  - D5.2.
  - D5.3.
  - D5.4.
  - D5.5.
- Out of scope:
  - Rewriting unrelated demo-app documentation.
- Source refs:
  - PRD: Sections 2, 3, 4, 5, 6.
  - Dogfooding: Sections 3.6, 3.7.

## 3. Parallelisation

```yaml
tracks:
  - name: serial-workflow-delivery
    deliverables:
      - D1.1
      - D1.2
      - D2.1
      - D2.2
      - D3.1
      - D3.2
      - D3.3
      - D4.1
      - D4.2
      - D4.3
      - D5.1
      - D5.2
      - D5.3
      - D5.4
      - D5.5
      - D5.6
    can_run_in_parallel_with:
      - none
    coordination_risk: Going parallel while the extraction/project model is changing would create coordination risk rather than delivery speed.
```

## 4. Dependencies

- M1 must happen first because workflow execution should not be built on the retired extraction aggregate.
- M2 follows once the approved extraction-stage/service model exists.
- M3 depends on M1 and M2 because it uses `RiviereProject`, loaded workflow state, and extraction services.
- M4 depends on M3 for meaningful run results, graph artefacts, and failure events.
- M5 comes last as the dogfooding proof.

## 5. Task creation readiness

- Deliverables concrete enough for issue creation: Yes
- Acceptance criteria observable: Yes
- Verification notes present where known: Yes
- PRD and architecture source refs present: Yes
- Dogfooding refs present for dogfooding deliverables: Yes
- Open blockers: None
