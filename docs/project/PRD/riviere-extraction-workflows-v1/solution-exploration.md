# Solution Exploration: Riviere Extraction Workflows V1

**Status:** Draft

---

## 1. Problem anchor

The approved problem is that Rivière graph-building currently depends on several manual ordered steps. This is acceptable for first-time exploration, but once users want to rebuild a graph inside a codebase, they must remember the sequence or create their own custom scripts. The result is repeatability friction, weak automation confidence, and a risk that Rivière feels “like a toy” rather than something that “just works reliably”.

## 2. Research scope and sources

**Section approval:** Pending

Research is required before selecting the product concept. The next planning conversation should approve the research scope, including market/comparable tools, open-source workflow patterns, and any internal sources the user wants to include.

## 3. Existing solution research

**Section approval:** Pending

[NEEDS CLARIFICATION]

## 4. Candidate approaches

**Section approval:** Pending

[NEEDS CLARIFICATION]

## 5. Selected product concept

**Concept approval:** Pending

[NEEDS CLARIFICATION]

## 6. Product paths

### Happy path

[NEEDS CLARIFICATION]

### Unhappy paths

[NEEDS CLARIFICATION]

## 7. No-gos and exclusions

[NEEDS CLARIFICATION]

## 8. Risk review

| Risk | Confidence | Evidence / reason | Open concern | Mitigation / next step |
| --- | --- | --- | --- | --- |
| Value | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] |
| Usability | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] |
| Feasibility | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] |
| Business viability | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] | [NEEDS CLARIFICATION] |

## 9. Risky assumptions

[NEEDS CLARIFICATION]

## 10. Rejected options

[NEEDS CLARIFICATION]

## 11. Open discovery questions

- What existing workflow, task-runner, pipeline, or extraction orchestration patterns should be researched before choosing a Rivière-specific solution?
- Should CI remain a future consideration only, or should solution exploration still research CI-compatible patterns so V1 does not paint itself into a corner?

## Existing draft context from the previous PRD

The following content was already captured in the previous discovery-style PRD. It is preserved as context for solution exploration, not treated as an approved final product decision under the new workflow.

### Previously approved design principles

- **Reliable automation without losing configurability.** Workflows should make graph rebuilding repeatable and robust, while still supporting the different ways people may need to configure extraction in real projects.
- **Protect repeatable graph creation as the product intent.** The PRD should stay focused on being able to create Rivière graphs repeatably after initial exploration, not on generic reliability or automation for its own sake.

### Previously captured product direction

We are building a new product capability: a way to define workflows that combine all the relevant steps for automating the creation of Rivière graphs.

Rivière’s graph is intended to be a living representation of a system’s architecture. Before this PRD, users manually follow ordered extraction steps, or create their own custom scripts if they want repeatability. After this PRD, users can define a workflow once for their project and run that workflow whenever they want to recreate the Rivière graph, including during local exploration, in CI, or whenever the code changes. These workflows provide a repeatable pipeline so the graph can stay in sync with the real code and system over time.

### Previously captured scope boundaries

- We are not changing Rivière graph visualisation as part of this work.
- We are not including migration or cleanup work as part of this work.

This scope boundary does not exclude defining the workflow capability clearly enough to build, including the user-facing workflow definition, command experience, and configuration requirements. Those details still need to be addressed through solution exploration, PRD drafting, and architecture.

### Previously captured success signals

- A user can define a workflow for creating a Rivière graph without needing to separately remember the manual extraction sequence.
- A user can re-run that workflow to recreate the graph for the same project.
- The workflow makes the required graph-creation steps visible enough that the user can understand what will run, rather than relying on undocumented custom scripts.
- V1 does not require a hard success goal that workflows run in CI. CI support may be a good topic for a later PRD.
