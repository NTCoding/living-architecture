# Dogfooding: Riviere Extraction Workflows V1

**Status:** Approved

---

## 1. New functionality added in this PRD to verify

1. **Project-local named Rivière workflows.** Users need a workflow definition that can be committed to a project and run repeatedly, instead of remembering ordered manual graph-building steps or writing custom scripts. References: `problem-definition.md` lines 11-15 and 21; `PRD.md` lines 17-25 and 43-48.
2. **Rivière-only stage vocabulary.** Workflows must run Rivière graph-building stages only, not arbitrary shell commands or generic task-runner steps. References: `PRD.md` lines 17, 43-48, 65, and 73-77.
3. **The first V1 stage set: `extract -> link -> validate -> write graph`.** The workflow must do more than extraction: it must include linking, validation, and final graph writing as the repeatable graph-building journey. References: `PRD.md` lines 25, 47-50, and 96-98.
4. **Empty-start graph rebuild with graph-state fold semantics.** A workflow starts from an empty graph state; each stage updates the current in-memory graph-building state; the final graph is written only after all stages succeed. References: `PRD.md` lines 19-23, 51-54, and 96-99; `ARCH.md` lines 125-128 and 273-289.
5. **All-or-nothing graph integrity.** If any stage fails, later stages must not run, the run's graph-building state must be discarded, the previous final graph must be left unchanged, and failure information must be logged. References: `PRD.md` lines 21, 54-57, and 98-100; `ARCH.md` lines 315-325.
6. **Workflow schema and stage-grammar validation.** Missing files, invalid YAML, unsupported versions, missing graph metadata, missing run-log directory, unknown stage types, duplicate stage names, missing extract config, missing link config, invalid stage order, missing `link`, and missing `validate` must fail before unsafe execution. Reference: `ARCH.md` sections 3 and 6.
7. **Run logs as newline-delimited structured JSON.** Workflow runs must produce searchable NDJSON logs with explicit lifecycle event types or operation identifiers. References: `PRD.md` lines 29 and 60-64; `ARCH.md` lines 315-325.
8. **Strict workflow extraction.** V1 workflow extraction runs with `{ allowIncomplete: false }`; workflow files and CLI options must not expose `allowIncomplete`. References: `ARCH.md` lines 161 and 590.
9. **`ecommerce-demo-app` as the concrete dogfooding project.** The demo app must receive real workflow files that cover combined config execution, modular multi-extraction execution, CI rebuild checking, and failure logging/all-or-nothing behaviour. Link stages must reference `.riviere/config/extraction.config.json` because that config owns cross-module connection rules. Expected-output verification remains outside product workflow execution. References: `solution-exploration.md` section 5; `PRD.md` sections 2, 4, and 6; `ARCH.md` sections 3, 4, and 6.

## 2. What dogfooding exists today

The existing dogfooding source is `../ecommerce-demo-app`. It already exercises deterministic extraction across a deliberately varied TypeScript e-commerce codebase, but it does not yet exercise named workflow execution, empty-start graph rebuilding, all-or-nothing graph writing, or workflow run logs.

Relevant existing coverage:

- The README describes the demo as a Rivière extraction workflow example and documents install/build/lint/test/extraction verification commands. Reference: `../ecommerce-demo-app/README.md` lines 3-7 and 17-26.
- The top-level package scripts include:
  - `extract`: `npx riviere extract --config .riviere/config/extraction.config.json`
  - `verify:extract`: `node scripts/verify-extraction.mjs`
  - `verify:connections`: `node scripts/verify-connections.mjs`
  - `test:extract`: `node scripts/verify-extraction.test.mjs`
  Reference: `../ecommerce-demo-app/package.json` lines 19-22.
- CI currently installs dependencies, builds all domains, runs architectural lint/tests, verifies extraction output, and verifies connection output. Reference: `../ecommerce-demo-app/.github/workflows/architecture.yml` lines 24-40.
- `.riviere/config/extraction.config.json` combines seven module configs with `$ref`: orders, shipping, inventory, payment, notifications, BFF, and UI. It also configures event publisher connection detection. Reference: `../ecommerce-demo-app/.riviere/config/extraction.config.json` lines 1-20.
- The module configs intentionally cover multiple extraction styles:
  - orders uses `@living-architecture/riviere-extract-conventions-published-language` via `extends`.
  - shipping uses JSDoc tags, event publishers, and a `backgroundJob` custom type.
  - inventory uses custom decorators.
  - payment uses interface-based matching.
  - notifications uses base-class/name matching.
  - BFF uses a mixed strategy and defines `httpCall` custom extraction.
  - UI uses name-based `*Page` matching.
  References: module configs under `../ecommerce-demo-app/.riviere/config/`.
- `verify-extraction.mjs` and `verify-connections.mjs` currently call `npx riviere extract --config .riviere/config/extraction.config.json --allow-incomplete` and compare CLI extraction output against expected fixtures. References: `../ecommerce-demo-app/scripts/verify-extraction.mjs` lines 20-29 and `../ecommerce-demo-app/scripts/verify-connections.mjs` lines 19-27.
- Current expected fixtures cover 81 extracted components and 86 expected internal links. The expected component set includes use cases, APIs, domain operations, events, event handlers, event publishers, UI, `backgroundJob`, and BFF `httpCall` components.
- Existing `.riviere/graph.json` is already a committed graph artefact. It currently contains graph metadata, 76 components, 58 internal links, and 5 external links. It is not currently rebuilt through a named workflow.
- No `.riviere/workflows/` files exist today.

Important gap: existing scripts verify extraction/linking output directly, but they do not verify the user's new workflow journey: define a named workflow, run it from a project, rebuild graph state from empty, write the final graph only after success, inspect a workflow run log, and run the same command from CI.

## 3. What new dogfooding to add

### 3.1 Add real V1 workflow definitions

Create these workflow files in `../ecommerce-demo-app`:

```text
.riviere/workflows/combined-config.yaml
.riviere/workflows/modular-config.yaml
.riviere/workflows/ci-check.yaml
.riviere/workflows/failure-workflow.yaml
```

The approved CLI assumption for dogfooding is:

```bash
npx riviere workflow run <workflow-file.yaml>
```

The exact external command can be updated later if the implementation chooses slightly different CLI wording; the dogfooding intent is that users run a workflow file directly.

#### Combined-config workflow

Location:

```text
.riviere/workflows/combined-config.yaml
```

Definition:

```yaml
version: 1
graph:
  sources:
    - name: ecommerce-demo-app
      repository: https://github.com/ntcoding/ecommerce-demo-app
  domains:
    - name: orders
    - name: shipping
    - name: inventory
    - name: payment
    - name: notifications
    - name: bff
    - name: ui
  outputPath: .riviere/graph.json
runLog:
  directory: .riviere/logs/workflows
stages:
  - extract:
      name: extract-main
      config: .riviere/config/extraction.config.json
  - link:
      config: .riviere/config/extraction.config.json
  - validate: {}
```

Why this shape:

- `combined-config.yaml` is the canonical positive workflow for rebuilding the committed graph artefact.
- The single extraction stage uses the approved dogfooding config `.riviere/config/extraction.config.json`, preserving the current `$ref` composition across module-specific configs.
- The `link` stage references `.riviere/config/extraction.config.json` because linking rules are config-owned, not global and not embedded in the workflow file.
- `link` and `validate` are present because `extract -> write graph` alone is explicitly insufficient for V1.
- `outputPath` writes the committed graph artefact `.riviere/graph.json` only after success.
- `runLog.directory` gives CI and local users a predictable place to inspect workflow execution.
- Domain names align with the extraction config: `orders`, `shipping`, `inventory`, `payment`, `notifications`, `bff`, and `ui`.

#### Modular-config workflow

Location:

```text
.riviere/workflows/modular-config.yaml
```

Definition:

```yaml
version: 1
graph:
  sources:
    - name: ecommerce-demo-app
      repository: https://github.com/ntcoding/ecommerce-demo-app
  domains:
    - name: orders
    - name: shipping
    - name: inventory
    - name: payment
    - name: notifications
    - name: bff
    - name: ui
  outputPath: .riviere/graph.modular.json
runLog:
  directory: .riviere/logs/workflows
stages:
  - extract:
      name: extract-orders
      config: .riviere/config/orders.extraction.json
  - extract:
      name: extract-shipping
      config: .riviere/config/shipping.extraction.json
  - extract:
      name: extract-inventory
      config: .riviere/config/inventory.extraction.json
  - extract:
      name: extract-payment
      config: .riviere/config/payment.extraction.json
  - extract:
      name: extract-notifications
      config: .riviere/config/notifications.extraction.json
  - extract:
      name: extract-bff
      config: .riviere/config/bff.extraction.json
  - extract:
      name: extract-ui
      config: .riviere/config/ui.extraction.json
  - link:
      config: .riviere/config/extraction.config.json
  - validate: {}
```

Why this shape:

- It dogfoods the V1 promise that workflows can use one or many extraction stages.
- It proves users are not forced to collapse all extraction into one stage when their mental model or repository setup is modular.
- It still references `.riviere/config/extraction.config.json` for linking because cross-module connection rules belong in Rivière config.
- It writes to `.riviere/graph.modular.json` so the modular workflow can be checked without overwriting the canonical committed graph generated by the combined workflow.

#### CI-check workflow

Location:

```text
.riviere/workflows/ci-check.yaml
```

Definition:

```yaml
version: 1
graph:
  sources:
    - name: ecommerce-demo-app
      repository: https://github.com/ntcoding/ecommerce-demo-app
  domains:
    - name: orders
    - name: shipping
    - name: inventory
    - name: payment
    - name: notifications
    - name: bff
    - name: ui
  outputPath: .riviere/graph.ci-check.json
runLog:
  directory: .riviere/logs/workflows
stages:
  - extract:
      name: extract-main
      config: .riviere/config/extraction.config.json
  - link:
      config: .riviere/config/extraction.config.json
  - validate: {}
```

Why this shape:

- It gives CI a normal CLI workflow run that verifies rebuildability without depending on the committed `.riviere/graph.json` as the output target.
- It does not add CI-specific product behaviour; CI simply calls Rivière.
- The verifier can remove `.riviere/graph.ci-check.json` after checking it if the implementation wants to avoid leaving generated files behind locally.

#### Failure workflow

Location:

```text
.riviere/workflows/failure-workflow.yaml
```

Definition:

```yaml
version: 1
graph:
  sources:
    - name: ecommerce-demo-app
      repository: https://github.com/ntcoding/ecommerce-demo-app
  domains:
    - name: orders
    - name: shipping
    - name: inventory
    - name: payment
    - name: notifications
    - name: bff
    - name: ui
  outputPath: .riviere/graph.json
runLog:
  directory: .riviere/logs/workflows
stages:
  - extract:
      name: extract-missing-config
      config: .riviere/config/__missing-dogfood-config.json
  - link:
      config: .riviere/config/extraction.config.json
  - validate: {}
```

Why this shape:

- It gives the demo app a stable baseline for the failure path users will need to understand.
- It proves a referenced config failure does not update `.riviere/graph.json`.
- It verifies a failed run still creates a useful structured run log.

No separate BFF-focused workflow is required because the combined and modular workflows should cover BFF extraction, `POST /bff/orders`, `PlaceOrderBFFUseCase`, and `httpCall` components. No single-domain smoke workflow is included because it does not seem useful enough for this PRD.

### 3.2 Add package scripts for workflow dogfooding

Add scripts equivalent to the following in `../ecommerce-demo-app/package.json`:

```json
{
  "scripts": {
    "workflow:combined": "npx riviere workflow run .riviere/workflows/combined-config.yaml",
    "workflow:modular": "npx riviere workflow run .riviere/workflows/modular-config.yaml",
    "workflow:ci-check": "npx riviere workflow run .riviere/workflows/ci-check.yaml",
    "verify:workflow:combined": "node scripts/verify-workflow.mjs combined-config .riviere/graph.json",
    "verify:workflow:modular": "node scripts/verify-workflow.mjs modular-config .riviere/graph.modular.json",
    "verify:workflow:ci-check": "node scripts/verify-workflow.mjs ci-check .riviere/graph.ci-check.json",
    "verify:workflow:failure": "node scripts/verify-workflow-failure.mjs",
    "dogfood:workflow": "npm run workflow:combined && npm run verify:workflow:combined && npm run workflow:modular && npm run verify:workflow:modular && npm run workflow:ci-check && npm run verify:workflow:ci-check && npm run verify:workflow:failure"
  }
}
```

The script must call Rivière as a normal project command, in the same spirit as the existing `extract` script. The implementation must not embed shell commands inside the Rivière workflow file.

### 3.3 Add a workflow success verifier

Create this file in `../ecommerce-demo-app`:

```text
scripts/verify-workflow.mjs
```

The verifier should run after each successful workflow and assert that the workflow behaved like a user would expect.

Invocation shape:

```bash
node scripts/verify-workflow.mjs <workflow-name> <graph-output-path>
```

Required checks:

1. The supplied graph output path exists and parses as JSON.
2. The graph has non-empty `components` and `links` arrays.
3. The graph contains components from every configured module/domain: orders, shipping, inventory, payment, notifications, BFF, and UI.
4. The graph includes representative extracted component kinds that prove the workflow exercised the real demo configuration:
   - UI: `OrderPage`
   - API: `POST /bff/orders`
   - BFF use case: `PlaceOrderBFFUseCase`
   - orders use case: `PlaceOrderUseCase`
   - shipping custom/background job: `update-tracking` with custom type `BackgroundJob`
   - BFF HTTP calls from expected extraction output: `checkFraud`, `checkStock`, `getProfile`, and `placeOrder`, once custom-type graph application supports them
5. The latest run log exists under `.riviere/logs/workflows/<workflow-name>/`.
6. The latest run log is valid NDJSON: every line is a JSON object.
7. Every run-log event includes at least `type`, `timestamp`, `runId`, `workflowName`, and `level`.
8. The success run includes lifecycle evidence for:
   - `WorkflowStarted`
   - `StageStarted` / `StageCompleted` for every configured extraction stage in that workflow
   - `StageStarted` / `StageCompleted` for `link`
   - `StageStarted` / `StageCompleted` for `validate`
   - `GraphWriteStarted`
   - `GraphWriteCompleted`
   - `WorkflowCompleted`
9. The success run must not include `WorkflowFailed`, `WorkflowValidationFailed`, `StageFailed`, or `GraphWriteFailed`.

Implementation notes:

- Do not compare the workflow run log to the old extraction expected-output fixture; workflow logs are product run logs, not extraction result fixtures.
- Keep the existing `verify:extract` and `verify:connections` scripts. Those continue to test extraction/linking output directly. The new verifier tests the workflow user journey.
- If strict workflow extraction exposes incomplete metadata that the existing `--allow-incomplete` extraction checks currently tolerate, treat that as a dogfooding finding to fix in the demo config or extraction implementation rather than weakening the workflow requirement.

### 3.4 Add an all-or-nothing failure verifier

Create this file in `../ecommerce-demo-app`:

```text
scripts/verify-workflow-failure.mjs
```

The failure verifier should run the committed failure workflow and prove the graph is not updated after a failed workflow.

Required scenario:

1. Read the current `.riviere/graph.json` content before running the negative case.
2. Run `npx riviere workflow run .riviere/workflows/failure-workflow.yaml` and expect a non-zero exit.
3. Assert `.riviere/graph.json` is byte-for-byte unchanged from the pre-run content.
4. Assert a run log exists for the failed run.
5. Assert the failed run log includes `WorkflowFailed` or `WorkflowValidationFailed`, includes the missing config path where available, and does not include `GraphWriteCompleted`.
6. Assert the failed run log is valid NDJSON and includes the standard event fields.

This check protects the PRD's most important trust promise: a failed run leaves the previous final graph unchanged.

### 3.5 Update CI

Update `../ecommerce-demo-app/.github/workflows/architecture.yml` by adding workflow dogfooding after the existing extraction/connection verification steps:

```yaml
      - name: Dogfood Rivière workflows
        run: pnpm dogfood:workflow
```

The CI should continue to run `verify:extract` and `verify:connections` separately because those fixtures are not product workflow execution; they are demo verification and regression coverage.

### 3.6 Update README

Update `../ecommerce-demo-app/README.md` so a user can understand the new dogfooding journey.

Required README additions:

- Add `npm run workflow:combined`, `npm run workflow:modular`, `npm run workflow:ci-check`, and `npm run dogfood:workflow` to the install/verify command list.
- Add a short section explaining that `.riviere/workflows/combined-config.yaml`, `.riviere/workflows/modular-config.yaml`, `.riviere/workflows/ci-check.yaml`, and `.riviere/workflows/failure-workflow.yaml` are the V1 project-local workflow examples.
- Explain that the positive workflows start from an empty graph state and write graph output only after `extract -> link -> validate` succeeds.
- Explain that link stages reference `.riviere/config/extraction.config.json` because connection/linking rules belong in Rivière config, not in the workflow file.
- Explain where run logs are written: `.riviere/logs/workflows/<workflow-name>/{runId}.ndjson`.
- Clarify that `expected-extraction-output.json` and `expected-connections.json` remain verification fixtures, not product workflow inputs.
- Clarify that the Rivière workflow remains Rivière-only; shell/npm/CI can call Rivière, but arbitrary shell commands do not live inside the workflow file.

### 3.7 Acceptance checks for the dogfooding work

The dogfooding implementation is complete when:

- `npm run workflow:combined` rebuilds `.riviere/graph.json` from `.riviere/workflows/combined-config.yaml` using `.riviere/config/extraction.config.json` for extraction and linking.
- `npm run workflow:modular` rebuilds `.riviere/graph.modular.json` from `.riviere/workflows/modular-config.yaml` using separate extraction stages and `.riviere/config/extraction.config.json` for linking.
- `npm run workflow:ci-check` rebuilds `.riviere/graph.ci-check.json` as a normal CLI workflow run suitable for CI verification.
- The workflow can be re-run repeatedly without a user manually sequencing extraction, linking, validation, or graph writing.
- The generated run log is NDJSON and includes the required lifecycle events.
- A successful workflow run writes `.riviere/graph.json` only after all stages succeed.
- `npm run verify:workflow:failure` runs `.riviere/workflows/failure-workflow.yaml`, observes a non-zero exit, leaves `.riviere/graph.json` unchanged, and verifies a useful failure log.
- CI runs the workflow dogfooding checks as normal project commands.
- README documentation explains how to use and inspect the workflow.

## 4. Blockers

No known blockers.
