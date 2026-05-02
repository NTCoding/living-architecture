# continue-planning

Advance the active planning topic by one stage.

## Workflow

1. Find the active planning marker in `docs/project/planning/*.yml`.
2. Read the current stage from the marker.
3. Check only the artifact for that stage.
4. Advance the marker only when the current artifact passes its checks.
5. Print blockers and keep the marker unchanged when the artifact fails its checks.

## Stage order

1. `prd-drafting`
2. `prd-approval`
3. `architecture-drafting`
4. `architecture-approval`
5. `task-creation`
6. `planning-complete`
