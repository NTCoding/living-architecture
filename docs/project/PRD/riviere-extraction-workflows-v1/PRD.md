# PRD: Riviere Extraction Workflows V1

**Status:** Approved

**PRD approval:** Approved

**Approval note:** Product discovery is complete enough for architecture drafting. This PRD records the approved product decision and intentionally excludes delivery milestones. Dogfooding planning later approved the link-stage config reference and brought modular workflow dogfooding back into V1 scope.

---

## 1. Problem Summary

The current Rivière graph-building process is made up of several manual steps that must be performed in order. This works for first-time learning and exploration, but once a user has created their first graph and wants to rebuild it inside a codebase, they must remember the steps or create their own custom scripts. That friction makes the process easy to forget, harder to repeat, and difficult to rely on in automated flows such as CI. At the project level, it risks Rivière feeling “like a toy” rather than a tool that can be set up in a project and “just works reliably”.

## 2. Product Decision

Rivière V1 workflows are Rivière-only graph-building workflows, not generic task runners.

A workflow is an ordered sequence of Rivière stages that starts from an empty graph state and progressively builds a new graph. Each stage takes the current graph state, applies one Rivière operation, and returns the updated graph state. This “graph state fold” model is the selected mental model, rather than a generic pipeline of independent artefact inputs and outputs.

If any stage fails, the workflow aborts immediately. Later stages must not run against broken, incomplete, or missing data. Failed runs must not update the final graph. Users should inspect the run log, fix the root cause, and re-run the workflow.

V1 should support one or many extraction stages, so users can run either a single combined extraction config or several focused configs such as `extract-bff`, `extract-orders`, and `extract-shipping`. Extraction and linking behaviour stays in Rivière configuration; the workflow orchestrates Rivière stages and does not duplicate detection rules, linking rules, custom types, or extraction semantics.

The link stage must be able to reference the Rivière config that owns connection/linking rules. For the `ecommerce-demo-app`, the link stage should reference `.riviere/config/extraction.config.json` because that combined config contains the cross-module connection configuration. The workflow file references the config; it must not inline or duplicate linking rules.

V1 must support `extract → link → validate → write graph` as the first workflow stage set. `extract → write graph` alone is not sufficient because it would add another abstraction layer on top of extraction without automating the manual graph-building steps. Linking must be included so the workflow produces a graph-building journey rather than only extracted components. Validation should be included because it is easy and gives confidence that the workflow output is valid.

The TypeScript six-step flow is the first canonical example to automate, but V1 should not lock the product model to only that process. The solution should account for key journeys such as multiple extractions across multiple codebases or parts of a codebase, and multiple linking passes where needed.

Run logs are primarily a developer aid in V1. Logging is easy and cheap, so Rivière should log generously where useful, at the appropriate level. Logs should be newline-delimited structured JSON events so they can be loaded, searched, and filtered easily. Key lifecycle logs should be easy to find through explicit event types or operation identifiers, such as `type: StartStep` and `type: StepCompleted`.

The `ecommerce-demo-app` should be the concrete dogfooding example. Its V1 dogfooding should include two positive workflows: a combined-config workflow using `.riviere/config/extraction.config.json`, and a modular-config workflow with separate extraction stages for the module configs and a link stage that references `.riviere/config/extraction.config.json`. The combined-config workflow preserves the current demo purpose of validating that multiple configs can be combined into a single config file using references. The modular-config workflow verifies the V1 promise that workflows can use one or many extraction stages. Dogfooding should also include a normal-CLI CI check workflow and a failure workflow/verification that proves failed runs leave `.riviere/graph.json` unchanged and produce a useful log. No CI-specific product behaviour is required in this PRD. Demo verification against expected outputs remains outside product workflow execution.

## 3. Users and Use Cases

- Users who have created their first Rivière graph and want to rebuild it inside a codebase: define and run a repeatable project-local Rivière workflow instead of remembering manual ordered steps or writing custom scripts.
- Users who need repeatable graph creation in automated flows such as CI: call a Rivière workflow from existing automation while keeping the workflow itself Rivière-only.
- Users with one combined extraction config or several focused extraction configs: run one or many extraction stages without moving extraction/linking behaviour into the workflow file.
- Users who need to understand or debug a workflow run: inspect clear stage progress and a run log, then fix the root cause and re-run the workflow if a stage fails.
- Rivière maintainers dogfooding the capability through `ecommerce-demo-app`: rebuild `.riviere/graph.json` from an empty graph state using real existing extraction config or configs, while keeping expected-output verification outside product workflow execution.

## 4. Product Requirements

- The product must provide a project-local workflow definition for ordered Rivière graph-building stages.
- The product must provide a way to run a named Rivière workflow repeatedly inside a project.
- Workflows must be Rivière-only graph-building workflows, not generic task runners.
- Workflow stages must use Rivière-specific stage vocabulary and must not support arbitrary shell-command stages or non-Rivière workflow stages.
- V1 must support `extract`, `link`, `validate`, and `write graph` as the first workflow stage set.
- `extract → write graph` alone must not be treated as sufficient for V1 because it would add another abstraction layer on top of extraction without automating the manual graph-building steps.
- Linking must be included so the workflow produces a graph-building journey rather than only extracted components.
- Validation must be included because it gives confidence that the workflow output is valid.
- A workflow run must start from an empty graph state in V1.
- A workflow run must follow the “graph state fold” model: each stage takes the current graph state, applies one Rivière operation, and returns the updated graph state.
- A successful workflow run must write the final graph only after all stages succeed, to the configured graph output such as `.riviere/graph.json`.
- If any stage fails, the workflow must abort immediately, prevent later stages from running, discard the run’s graph-building state, write a log, and leave the previous final graph unchanged.
- If the workflow file is missing or invalid, Rivière must fail before running stages, explain the issue, and leave the graph unchanged.
- If a referenced Rivière config file is missing, Rivière must abort before or at the affected stage, explain which config path failed, and leave the graph unchanged.
- If an extraction config matches no files or produces invalid stage output, Rivière must abort immediately, write a log, and leave the graph unchanged.
- V1 must support one or many extraction stages, including a single combined extraction config or several focused configs such as `extract-bff`, `extract-orders`, and `extract-shipping`.
- Extraction and linking behaviour must stay in Rivière configuration; the workflow must not duplicate detection rules, linking rules, custom types, extraction semantics, or workflow settings that change extraction result semantics.
- A link stage must be able to reference the Rivière config file that owns connection/linking rules.
- Link-stage config references must not move connection/linking rules into the workflow file.
- Rivière must show clear stage progress and write a run log so the user can understand what happened.
- V1 run logs must be newline-delimited structured JSON events.
- V1 should log generously where useful, at the appropriate level.
- Each log event must include an explicit event type or operation identifier so key logs can be loaded, searched, and filtered easily.
- Key workflow lifecycle events must be easily searchable, including events such as `StartStep` and `StepCompleted`.
- npm scripts, CI, Taskfile, Make, or just may call Rivière, but they must not be embedded inside Rivière workflows as non-Rivière commands.
- The `ecommerce-demo-app` must receive a real combined-config workflow that rebuilds `.riviere/graph.json` from an empty graph state using the existing combined extraction config, `.riviere/config/extraction.config.json`, for extraction and link configuration.
- The `ecommerce-demo-app` V1 workflow must preserve the current demo purpose of validating that multiple configs can be combined into a single config file using references.
- The `ecommerce-demo-app` must receive a real modular-config workflow that rebuilds graph output from an empty graph state using separate extraction stages for module config files and a link stage that references `.riviere/config/extraction.config.json`.
- The `ecommerce-demo-app` workflows must be set up in CI as normal CLI calls so Rivière can learn from real CI usage.
- The `ecommerce-demo-app` dogfooding must include a failure workflow or failure verifier that proves failed runs leave `.riviere/graph.json` unchanged and produce a useful failure log.
- Demo verification against expected outputs must remain outside product workflow execution.

## 5. Non-Goals

- No arbitrary shell-command stages.
- No generic task-runner flexibility.
- No non-Rivière workflow stages.
- No extraction or linking rules inside the workflow file.
- No workflow settings that change extraction result semantics; those belong in Rivière configuration or the stage’s own config.
- No partial graph success.
- No continuing after a failed stage.
- No updating the final graph after a failed run.
- No starting from an existing graph in V1; V1 always starts from an empty graph state.
- No treating expected-output test fixtures as part of product workflow execution.
- No treating “AI-assisted” as manual user work hidden behind a workflow step.
- No CI-specific behaviour, reporting, annotations, job summaries, or observability strategy in this PRD; the workflow only needs to be callable from CI as a normal CLI command.
- No enrich as a first-class workflow stage in this PRD.
- No AI-assisted stages in this PRD.
- No preset workflows in this PRD.
- No plan-first/preview mode in this PRD.
- Enrich, AI-assisted stages, preset workflows, and plan-first/preview mode are deferred from this PRD, but they are not rejected; they are recorded in `deferred-items.md` as important future product work so they do not fall off the roadmap.
- No changes to Rivière graph visualisation as part of this work.
- No migration or cleanup work as part of this work.

## 6. Success Criteria

- A user can define and run a project-local named Rivière workflow made only from ordered Rivière stages.
- The first V1 workflow stage set supports `extract → link → validate → write graph`.
- A workflow starts from an empty graph state, runs stages in order, and writes the final graph only when all stages succeed.
- A failed workflow leaves the previous final graph unchanged, stops later stages from running, and provides clear failure information through stage output and a run log.
- A workflow run emits newline-delimited structured JSON logs with searchable event types or operation identifiers.
- A workflow can use either a single combined extraction config or multiple focused extraction configs without duplicating extraction/linking behaviour in the workflow file.
- A link stage can reference the Rivière config file that owns connection/linking rules without inlining those rules in the workflow file.
- Existing automation such as npm scripts or CI can call the Rivière workflow while the Rivière workflow remains Rivière-only.
- `ecommerce-demo-app` can rebuild `.riviere/graph.json` from an empty graph state using a combined-config workflow that references `.riviere/config/extraction.config.json` for extraction and linking.
- `ecommerce-demo-app` can run a modular-config workflow with separate extraction stages for module config files and link configuration from `.riviere/config/extraction.config.json`.
- The V1 `ecommerce-demo-app` combined workflow preserves the current validation that multiple configs can be combined into a single config file using references.
- `ecommerce-demo-app` runs the workflows in CI as normal CLI commands, with no CI-specific behaviour required.
- `ecommerce-demo-app` verifies that failed workflow runs leave `.riviere/graph.json` unchanged and produce a useful failure log.
- Demo expected-output verification remains separate from product workflow execution.

## 7. Open Product Questions

No open product questions.

## 8. Architecture Questions

- How should the architecture represent the “graph state fold” model while keeping each stage a Rivière operation rather than a generic task?
- How should the architecture preserve all-or-nothing graph integrity and prevent final graph updates after failed runs?
- How should workflow definitions reference and resolve one or many Rivière config files while keeping extraction/linking semantics outside the workflow file?
- How should stage progress and newline-delimited structured JSON run logs be exposed or stored so users can understand what happened without adding plan-first/preview mode to V1?

## 9. Source Traceability

- Problem definition: `problem-definition.md`
- Solution exploration: `solution-exploration.md`
- Key source sections:
  - `problem-definition.md` → Approved inputs; Problem statement
  - `solution-exploration.md` → 1. Problem anchor; 2. Research scope and sources; 3. Existing solution research; 5. Selected product concept; 6. Product paths; 7. No-gos and exclusions; 8. Risk review; 9. Risky assumptions; 10. Rejected options; 11. Open discovery questions
