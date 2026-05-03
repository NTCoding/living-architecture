# architecture-approval

Review the active architecture document and either approve it, block it, or return to product discovery/PRD drafting if architecture reveals a product-impact issue.

## Active files

Use the files passed in the runtime context:

- `prdPath`
- `solutionExplorationPath`
- `architecturePath`

This stage reviews the architecture only.
It does not create delivery milestones.
It does not create tasks.

## Required starting condition

The architecture document must contain:

```text
**Status:** Awaiting Architecture Approval
```

If not, `/dev-workflow-v2:continue-planning` must produce:

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

## Return checks

If architecture reveals that the selected product concept should change, `/dev-workflow-v2:continue-planning` must produce:

```text
RETURN: solution-exploration
```

If architecture confirms the concept but reveals that PRD requirements, non-goals, success criteria, or architecture questions need revision, `/dev-workflow-v2:continue-planning` must produce:

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

Then `/dev-workflow-v2:continue-planning` must produce:

```text
ADVANCE: delivery-planning
```

## On rejection

If the architecture fails any approval check but does not require a return outcome, `/dev-workflow-v2:continue-planning` must produce:

```text
BLOCK
- <missing or invalid approval condition>
- <missing or invalid approval condition>
```
