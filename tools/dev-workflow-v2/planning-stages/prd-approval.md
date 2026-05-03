# prd-approval

Review the active PRD and either approve it, block it, or return to discovery/PRD drafting if the product decision is not ready.

## Active files

Use the files passed in the runtime context:

- `problemDefinitionPath`
- `solutionExplorationPath`
- `prdPath`

This stage reviews the PRD only.
It does not write architecture content.
It does not create delivery milestones.
It does not create tasks.

## Required starting condition

The PRD header must contain:

```text
**Status:** Awaiting Architecture Review
```

If not, `/dev-workflow-v2:continue-planning` must produce:

```text
BLOCK
- PRD status is not Awaiting Architecture Review
```

## Approval checks

Approve only if all of these are true:

1. `problem-definition.md` is approved
2. `solution-exploration.md` is approved
3. the selected concept is approved in `solution-exploration.md`
4. the PRD records the selected product decision rather than rediscovering it
5. the PRD problem summary traces to approved `problem-definition.md`
6. the PRD product decision, requirements, non-goals, and success criteria trace to approved `solution-exploration.md` or user-approved PRD drafting clarifications
7. users and use cases are explicit enough for architecture to reason about product behaviour
8. success criteria are observable
9. architecture questions are questions, not architecture decisions
10. the PRD contains no delivery milestones, parallelisation, task breakdown, or issue-generation material
11. the PRD contains no architecture decisions outside architecture questions
12. the PRD has source traceability back to both approved discovery artefacts

## Return checks

If the PRD cannot pass because the selected product concept itself is unclear, unsupported by research, missing a four-risk review, or still has unresolved feasibility that should be handled before PRD drafting, `/dev-workflow-v2:continue-planning` must produce:

```text
RETURN: solution-exploration
```

If the product concept remains valid but the PRD wording, requirements, non-goals, success criteria, or architecture questions need revision, `/dev-workflow-v2:continue-planning` must produce:

```text
RETURN: prd-drafting
```

## On approval

If the PRD passes:

- rewrite the PRD header to:

```text
**Status:** Approved
```

- ensure the PRD has an approval note immediately under the PRD approval marker:

```text
**Approval note:** Product discovery is complete enough for architecture drafting. This PRD records the approved product decision and intentionally excludes delivery milestones.
```

If the approval note already exists, update it to match the current approval reason.

Then `/dev-workflow-v2:continue-planning` must produce:

```text
ADVANCE: architecture-drafting
```

## On rejection

If the PRD fails any approval check but does not require a return outcome, `/dev-workflow-v2:continue-planning` must produce:

```text
BLOCK
- <missing or invalid approval condition>
- <missing or invalid approval condition>
```
