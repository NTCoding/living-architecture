# Solution Exploration: Riviere Extraction Workflows V1

**Status:** Approved

---

## 1. Problem anchor

The approved problem is that Rivière graph-building currently depends on several manual ordered steps. This works for first-time learning and exploration, but once a user has created their first graph and wants to rebuild it inside a codebase, they must remember the steps or create their own custom scripts. That friction makes graph creation easy to forget, harder to repeat, and difficult to rely on in automated flows such as CI. At the project level, it risks Rivière feeling “like a toy” rather than a tool that can be set up in a project and “just works reliably”.

## 2. Research scope and sources

The approved research scope was to use comparable developer workflow patterns as framing and constraints, especially to understand “what can we reuse that already exists, and what patterns can we be inspired by.” The research was used to constrain the solution, not to copy a generic workflow engine.

The central product tension accepted during exploration was: “how do we make automation feel trustworthy without hiding too much of the extraction process from the user?” The user needs to understand what is happening and be able to jump in if they do not get the results they want.

Internal Rivière context and the `ecommerce-demo-app` were approved as concrete sources. The `ecommerce-demo-app` is the test project for dogfooding the workflow capability with real data and configs.

| Source | Type | Why included | Accepted finding |
| --- | --- | --- | --- |
| npm scripts documentation: `https://docs.npmjs.com/cli/v10/using-npm/scripts` | Comparable developer workflow | Familiar project-local command pattern. | Useful inspiration for “define once, run repeatedly”, but scripts can become opaque strings. Rivière should not hide the graph-building process inside arbitrary commands. |
| GNU Make introduction: `https://www.gnu.org/software/make/manual/html_node/Introduction.html` | Comparable developer workflow | Established ordered/repeatable build workflow model. | Useful for repeatability and dependency thinking, but too build-system-heavy for a Rivière V1 workflow. |
| Taskfile guide: `https://taskfile.dev/usage/` | Comparable developer workflow / open-source tool | Modern YAML task runner with named tasks, dependencies, preconditions, status checks, and visible task lists. | Useful inspiration for visible, repeatable workflows, but Rivière must not recreate a generic task runner. |
| just manual: `https://just.systems/man/en/` | Comparable developer workflow / open-source tool | Project-specific command runner with clearer ergonomics than Make. | Useful inspiration for named, visible project workflows, but insufficiently Rivière-specific if copied directly. |
| GitHub Actions workflows documentation: `https://docs.github.com/en/actions/writing-workflows/about-workflows` | CI workflow pattern | CI-compatible workflow concepts: triggers, jobs, runners, and steps. | Useful as a CI-compatibility lens, but full CI triggers/jobs/runners are out of scope for V1 and would overcomplicate the product. |
| Rivière TypeScript extraction documentation: `https://living-architecture.dev/extract/deterministic/typescript/workflow/` | Internal/product source | Existing six-step TypeScript extraction flow. | The six-step TypeScript workflow is the first canonical example to automate, but V1 must not lock the product model to only this one process. |
| `ecommerce-demo-app/.riviere/config/extraction.config.json` | Internal/dogfood source | Real extraction config that composes multiple module configs. | The extraction config owns how orders, shipping, inventory, payment, notifications, BFF, UI, custom HTTP calls, event publishers, etc. are found and linked. The workflow should reuse config rather than duplicate extraction/linking rules. |
| `ecommerce-demo-app/.riviere/config/bff.extraction.json` | Internal/dogfood source | Concrete custom type example for BFF HTTP calls. | The BFF config defines `httpCall` detection and metadata extraction. Workflow should orchestrate this config, not copy those rules into the workflow file. |
| `ecommerce-demo-app/package.json` and verification scripts | Internal/dogfood source | Shows current script-based repeatability and test fixtures. | Test expected outputs such as `expected-extraction-output.json` and `expected-connections.json` are for testing the demo, not product workflow execution. |

## 3. Existing solution research

Comparable tools show that developers already understand project-local repeatable commands, named workflows, ordered steps, logs, status output, and CI-compatible entry points. However, these tools also reveal the main product risk: it would be easy for Rivière workflows to become a general-purpose task runner.

The accepted constraint is that Rivière workflows must not become a generic task runner. They should only run Rivière workflows, be 100% built around Rivière, and be optimised fully for Rivière. No flexibility should be added for anything that is not Rivière.

The strongest pattern to borrow is “project-local, named, repeatable workflows with visible ordered steps”, while keeping the workflow language specific to graph creation. npm scripts and CI can call the workflow; Taskfile, just, Make, and GitHub Actions can inspire the experience; but the Rivière workflow itself should explain and run the graph-building process rather than hide it inside arbitrary shell commands.

The `ecommerce-demo-app` research showed a concrete dogfooding path. It already has real Rivière extraction configuration under `.riviere/config/`, including a top-level config that references module-specific configs and a BFF config with custom `httpCall` detection. This means V1 should support both a single combined extraction config and multiple focused extraction configs such as `extract-bff`, `extract-orders`, and `extract-shipping`.

## 4. Candidate approaches

### Option A: Rivière-specific workflow file and run command

- Concept: A project-local workflow definition lets users define and run ordered Rivière stages for graph creation.
- Who it helps: Users who have moved beyond first-time exploration and need repeatable graph creation inside a project.
- User change: Users run a named Rivière workflow instead of remembering manual steps or writing custom scripts.
- Relevant research: Borrows “define once, run repeatedly” from npm scripts, just, Taskfile, Make, and CI workflows, while keeping stage vocabulary Rivière-only.
- Trade-off: Gives strong product clarity and repeatability, but needs firm boundaries so it does not become a generic task runner.
- Risk: If workflow configuration starts containing extraction/linking behaviour, product boundaries blur and workflows become harder to trust.

### Option B: Rivière preset workflows

- Concept: Rivière provides standard pre-baked workflows for common graph-building journeys, with users mainly configuring inputs and outputs.
- Who it helps: New users who want a guided setup and do not yet know which stages they need.
- User change: Users initialise and run a standard workflow rather than designing their own sequence.
- Relevant research: Similar to framework defaults and guided commands in developer tooling.
- Trade-off: Simpler first-run experience, but may be too constraining for real projects.
- Risk: Presets could hide too much and fail for users with multiple codebases, multiple extraction passes, or mixed deterministic/AI-assisted needs.

### Option C: Plan-first workflow runner

- Concept: Rivière shows the planned stages before executing, then runs the approved workflow and records logs.
- Who it helps: Users who need extra confidence before running graph updates.
- User change: Users can inspect what will happen before the workflow mutates graph state.
- Relevant research: Inspired by CI/job plan visibility and task-runner list/status output.
- Trade-off: Strong trust-building, but likely adds extra surface area beyond the minimum V1.
- Risk: Could delay the core repeatable-run capability if treated as required for the first version.

### Option D: Configuration-only graph rebuild command

- Concept: Users configure graph extraction settings, then run a single rebuild command without an explicit staged workflow.
- Who it helps: Users whose graph creation process is simple and fixed.
- User change: Users get a simpler config file and command, but not a true workflow.
- Relevant research: Similar to standard tool configuration files.
- Trade-off: Safer and simpler than a staged workflow, but does not fit projects that need different ordered steps.
- Risk: It may not solve the problem for users with multiple extraction files, multiple codebase areas, repeated linking, or AI-assisted stages.

## 5. Selected product concept

**Concept approval:** Approved

Rivière V1 workflows are Rivière-only graph-building workflows, not generic task runners.

A workflow is an ordered sequence of Rivière stages that starts from an empty graph state and progressively builds a new graph. Each stage takes the current graph state, applies one Rivière operation, and returns the updated graph state. This “graph state fold” model is the selected mental model, rather than a generic pipeline of independent artefact inputs and outputs.

If any stage fails, the workflow aborts immediately. Later stages must not run against broken, incomplete, or missing data. Failed runs must not update the final graph. Users should inspect the run log, fix the root cause, and re-run the workflow.

V1 should support one or many extraction stages, so users can run either a single combined extraction config or several focused configs such as `extract-bff`, `extract-orders`, and `extract-shipping`. Extraction and linking behaviour stays in Rivière configuration; the workflow orchestrates Rivière stages and does not duplicate detection rules, linking rules, custom types, or extraction semantics.

The TypeScript six-step flow is the first canonical example to automate, but V1 should not lock the product model to only that process. The solution should account for key journeys such as multiple extractions across multiple codebases or parts of a codebase, multiple linking passes where needed, and AI-assisted stages where deterministic setup is not available.

AI-assisted workflow stages, when included, must be Rivière-owned stages run through configured headless AI CLI tools such as Claude, OpenCode, or pi.dev. They must not mean “the user manually does it with their own AI assistant”, and they must not turn the workflow runner into a generic prompt runner.

The `ecommerce-demo-app` should be the concrete dogfooding example. It should receive a real workflow that rebuilds `.riviere/graph.json` from an empty graph state using its existing real extraction config or configs. Demo verification against expected outputs remains outside product workflow execution.

## 6. Product paths

### Happy path

1. A user has already created their first Rivière graph and wants repeatable graph creation inside a project.
2. The user defines a project-local Rivière workflow made only from Rivière stages.
3. The workflow starts from an empty graph state.
4. Each stage runs in order, using the relevant Rivière configuration where needed.
5. Each successful stage updates the in-memory graph-building state.
6. Rivière shows clear stage progress and writes a run log so the user can understand what happened.
7. If all stages succeed, Rivière writes the final graph to the configured graph output, such as `.riviere/graph.json`.
8. The user can re-run the same workflow whenever they need to rebuild the graph.

### Unhappy paths

- Workflow file is missing or invalid -> Rivière should fail before running stages, explain the issue, and leave the graph unchanged.
- A referenced Rivière config file is missing -> Rivière should abort before or at the affected stage, explain which config path failed, and leave the graph unchanged.
- An extraction config matches no files or produces invalid stage output -> Rivière should abort immediately, write a log, and leave the graph unchanged.
- A stage fails after earlier stages succeeded -> Rivière should discard the run’s graph-building state, stop later stages from running, and leave the previous final graph unchanged.
- A user wants to run non-Rivière commands -> the workflow should not support this; npm scripts, CI, Taskfile, Make, or just can call Rivière, not be embedded inside Rivière workflows.
- A user needs to debug poor extraction results -> V1 should provide logs and stage visibility as a starting point; a dedicated debugging document or AI skill may be future scope.
- A repository uses multiple extraction configs instead of one combined config -> V1 should support multiple extraction stages so the user does not need to glue all configs through `$ref` first.
- A repository needs AI-assisted extraction because no deterministic setup exists -> the product concept allows Rivière-owned AI-assisted stages, but these stages must have defined outputs and hard failure behaviour.

## 7. No-gos and exclusions

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
- No plan-first/preview mode as a required V1 feature; it is a future improvement.
- No preset workflows as the core V1 approach; pre-baked workflows for common tasks may be a future enhancement.
- No changes to Rivière graph visualisation as part of this work.
- No migration or cleanup work as part of this work.

## 8. Risk review

| Risk | Confidence | Evidence / reason | Open concern | Mitigation / next step |
| --- | --- | --- | --- | --- |
| Value | Medium/High | The concept directly addresses the approved problem: users need repeatable graph creation without remembering manual ordered steps or writing custom scripts. The user strongly approved the graph state fold direction. | Users may need richer step control than the first version provides, especially across multiple codebases or mixed extraction modes. | PRD should preserve support for one or many extraction stages and should explicitly name multi-config journeys. |
| Usability | Medium | The graph state fold model gives a coherent user mental model: each Rivière stage updates the current graph-building state. Stage progress and logs help users understand what is happening. | The workflow file and CLI output must make “starts empty”, “all-or-nothing”, and “Rivière-only stages” obvious. | PRD should require clear CLI progress, run logs, and hard-stop failure messages. |
| Feasibility | Medium | The concept is grounded in existing Rivière extraction configuration and the real `ecommerce-demo-app`, including `.riviere/config/extraction.config.json` and module-specific configs. | Automated AI-assisted stages require careful definition because today “AI-assisted” can mean manual work with a user’s own AI assistant. | PRD should define which V1 stages are implemented first and require AI-assisted stages, where included, to be Rivière-owned with defined outputs and hard failure behaviour. |
| Business viability | High/Medium | The concept keeps Rivière focused on graph-building workflows and avoids generic task-runner sprawl. Dogfooding through `ecommerce-demo-app` reduces product drift. | Supporting too many workflow shapes could expand scope beyond the repeatable graph creation problem. | Keep V1 bounded to Rivière stages, empty-start graph rebuilds, all-or-nothing integrity, and dogfooding on `ecommerce-demo-app`. |

## 9. Risky assumptions

- Users will understand and value the “graph state fold” mental model if the workflow file and CLI output are clear.
- Starting from an empty graph state is sufficient for V1 repeatability and preferable to updating an existing graph.
- All-or-nothing execution is acceptable even when earlier stages succeeded, because graph integrity is more important than partial progress.
- Existing Rivière extraction configuration can remain the correct home for extraction/linking behaviour while workflows only orchestrate stages.
- The `ecommerce-demo-app` is representative enough to dogfood the first version because it includes multiple module configs, custom extraction types, and real expected graph output.
- AI-assisted stages can be productised as Rivière-owned stages with defined outputs, rather than remaining manual AI-assistant work.
- Basic introspectability through stage output and logs is enough for V1, while richer plan-first/debugging support can come later.

## 10. Rejected options

- Generic task runner: rejected because Rivière workflows must only run Rivière workflows and should not add flexibility for non-Rivière tasks.
- Arbitrary shell-command workflow stages: rejected because they would hide the graph-building process and duplicate npm scripts, Make, Taskfile, just, or CI tools.
- Fixed six-step TypeScript-only workflow: rejected because the TypeScript six-step flow is a canonical example, not the whole product model. Users may need multiple extractions, multiple codebase areas, repeated linking, or AI-assisted stages.
- Preset-only workflows: rejected for V1 because they may be too constraining. Pre-baked workflows for common tasks may be a future enhancement.
- Plan-first workflow runner as required V1 scope: rejected as a V1 requirement because it is useful but not necessary for the first repeatable-run capability.
- Configuration-only graph rebuild command: rejected because it is not really a workflow and does not address users who need different Rivière stages or multiple extraction configs.
- Pipeline of independent artefact inputs and outputs: rejected in favour of the graph state fold mental model, where each stage updates the current graph-building state.
- Starting from an existing graph in V1: rejected because it risks stale data and weakens repeatability; V1 should always start from empty.
- Expected-output verification inside product workflows: rejected because expected outputs are for tests and dogfooding verification, not normal product execution.

## 11. Open discovery questions

- Which exact Rivière stages should be implemented in the first V1 delivery slice, especially around link, enrich, validate, and graph writing?
- How should AI-assisted Rivière stages be configured at product level without turning workflows into generic prompt runners?
- What minimum run log format is enough for V1 introspectability?
- How should the `ecommerce-demo-app` workflow be shaped if it uses both a combined extraction config and module-specific extraction configs?
