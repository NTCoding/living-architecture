# architecture-approval

Review the active architecture document and either approve it, block it, or return to product discovery/PRD drafting if architecture reveals a product-impact issue.

## Active files

Use the files passed in the runtime context:

- `prdPath`
- `solutionExplorationPath`
- `architecturePath`
- `projectMemoryArchitectureInstructionsPath`
- `projectMemoryArchitectureReadmePath`
- `projectMemoryArchitectureMemoriesPath`

This stage reviews the architecture only.
It does not create delivery milestones.
It does not create tasks.

Before approval checks, read `projectMemoryArchitectureInstructionsPath` and `projectMemoryArchitectureReadmePath`, then check whether any approved architecture memories under `projectMemoryArchitectureMemoriesPath` are relevant to the architecture's system areas or architecture concepts.

Architecture memories are advisory. If a relevant memory appears to conflict with the architecture, clarify whether it applies before treating the conflict as an approval concern.

## Required starting condition

The architecture document must contain:

```text
**Status:** Awaiting Architecture Approval
```

If not, the current planning command must produce:

```text
BLOCK
- Architecture status is not Awaiting Architecture Approval
```

## Approval checks

Approve only if all of these are true:

1. the PRD is approved
2. the solution exploration is approved
3. the architecture states the real technical problems being solved
4. the architecture confirms or updates the feasibility assumptions from solution exploration
5. each major decision has explicit options
6. each reviewed decision has one approved choice
7. rejected options are explicitly identified
8. product-impact notes are explicit, even if they say no product-impact changes were identified
9. task generation consequences are written explicitly
10. the architecture removes technical approvals from PRD requirement text instead of duplicating them there
11. the architecture does not change product scope without returning to the appropriate earlier stage
12. relevant approved architecture memories were considered as advisory context, and any unclear applicability or conflict was clarified with the user
13. any design that loads, rebuilds, materialises, migrates, or replaces application state explicitly names the application state, owning aggregate, repository, load call, load inputs, loaded output, data origins, and caller
14. any design that replaces a repository, aggregate, loader, or persistence boundary names the approved replacement boundary and does not leave that decision to implementation
15. task generation consequences include major design decisions needed by implementation tickets, including before/after code shape where architecture contains code-level design
16. no implementation task would need to make a major design decision unless that decision is explicitly included as acceptance criteria

If any state-loading or replacement design is described only with vague phrases such as "materialise", "load the state", "create the stage", "use the new model", or "wire up the service" without the concrete loading boundary and data origins, block architecture approval.

## Return checks

If architecture reveals that the selected product concept should change, the current planning command must produce:

```text
RETURN: solution-exploration
```

If architecture confirms the concept but reveals that PRD requirements, non-goals, success criteria, or architecture questions need revision, the current planning command must produce:

```text
RETURN: prd-drafting
```

## On approval

If the architecture passes:

- rewrite the architecture header to:

```text
**Status:** Approved
```

- ensure the architecture has an approval note immediately under the status line:

```text
**Approval note:** Architecture confirms the approved product direction and provides enough technical shape for delivery planning.
```

Then the current planning command must produce:

```text
ADVANCE: delivery-planning
```

## On rejection

If the architecture fails any approval check but does not require a return outcome, the current planning command must produce:

```text
BLOCK
- <missing or invalid approval condition>
- <missing or invalid approval condition>
```
