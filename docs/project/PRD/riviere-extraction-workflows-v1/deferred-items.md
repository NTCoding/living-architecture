# Deferred Items: Riviere Extraction Workflows V1

These items are deferred from this PRD, but they are not rejected. They are important future product work and should remain visible so they do not fall off the roadmap.

## Deferred from this PRD

- Enrich as a first-class workflow stage. See `project-memory/ideas/workflow-enrich-stage/idea.md`.
- AI-assisted stages. See `project-memory/ideas/ai-assisted-workflow-stages/idea.md`.
- Preset workflows. See `project-memory/ideas/preset-workflows/idea.md`.
- Plan-first/preview mode. See `project-memory/ideas/workflow-plan-preview-mode/idea.md`.
- CI-specific behaviour, reporting, annotations, job summaries, or observability strategy. See `project-memory/ideas/ci-workflow-observability/idea.md`.

## Moved back into this PRD

- A separate validation/demo for workflows with multiple extraction steps is no longer deferred. During dogfooding planning, the user overruled the earlier deferral and approved a modular-config workflow for `ecommerce-demo-app`. See `project-memory/ideas/multiple-extraction-step-demo/idea.md`.

## Future product questions

- How should enrich work as a first-class workflow stage?
- How should AI-assisted Rivière stages be configured at product level without turning workflows into generic prompt runners?
- What preset workflows would help common graph-building journeys without making V1 preset-led?
- What should plan-first/preview mode show before a workflow mutates graph state?
- How should CI observability evolve after Rivière has real feedback from running the `ecommerce-demo-app` workflow in CI?

## Deferral rationale

V1 must focus on automating the core manual graph-building workflow for the first dogfood target, `../ecommerce-demo-app`.

The approved V1 stage set is:

```text
extract → link → validate → write graph
```

`extract → write graph` alone is not sufficient because it would add another abstraction layer on top of extraction without automating the manual graph-building steps.

Linking is included because the workflow must produce a graph-building journey rather than only extracted components.

Validation is included because it is easy and gives confidence that the workflow output is valid.

The V1 `ecommerce-demo-app` dogfooding now includes both a combined-config workflow and a modular-config workflow. The combined workflow preserves the existing validation that multiple configs can be combined into a single config file using references. The modular workflow proves workflows with multiple extraction steps.
