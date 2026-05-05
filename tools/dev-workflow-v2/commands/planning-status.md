# planning-status

Show the current local planning session.

## Step 1: Find the active planning session

List `docs/project/PRD/*/marker.yml`.

Active planning session means:

- `stage != planning-complete`

If there are no active planning markers, report:

```text
No active planning session found.
Run `/dev-workflow-v2:start-planning <topic>` to begin.
```

If there is more than one active planning marker, stop and report all of them. Do not guess.

If there is exactly one active planning marker, use it.

## Step 2: Derive sibling document paths by convention

From `planningId`, derive:

- problem definition: `docs/project/PRD/<planning-id>/problem-definition.md`
- solution exploration: `docs/project/PRD/<planning-id>/solution-exploration.md`
- PRD: `docs/project/PRD/<planning-id>/PRD.md`
- architecture: `docs/project/PRD/<planning-id>/ARCH.md`
- dogfooding: `docs/project/PRD/<planning-id>/dogfooding.md`
- delivery plan: `docs/project/PRD/<planning-id>/delivery.md`

## Step 3: Determine the current artifact

- `problem-definition` -> current artifact is `problem-definition.md`
- `solution-exploration` -> current artifact is `solution-exploration.md`
- `prd-drafting` or `prd-approval` -> current artifact is `PRD.md`, compiled from approved discovery artefacts
- `architecture-drafting` or `architecture-approval` -> current artifact is `ARCH.md`, with product-impact loop-back if feasibility invalidates the PRD
- `dogfooding` -> current artifact is `dogfooding.md`, with loop-back if dogfooding exposes a PRD or architecture gap
- `delivery-planning` -> current artifact is `delivery.md`
- `task-creation` -> current artifact is the approved PRD, approved architecture, approved delivery plan, and the GitHub issue set being created

`planning-status` reports only active planning sessions. Completed planning sessions are used by `/dev-workflow-v2:choose-next-task` when they have approved delivery plans and open GitHub issues.

## Step 4: Inspect the current stage in read-only mode

Do not run the interactive stage workflow and do not modify files.

Inspect the current artefact and report obvious blockers using the current stage's completion rules, such as missing files, missing approval status, `[NEEDS CLARIFICATION]` markers, or a marker stage that points to an artefact that does not exist.

If a blocker requires judgement or user conversation, report it as:

```text
- Current stage requires `/dev-workflow-v2:continue-planning` to continue the interview or approval flow
```

## Step 5: Print the status

Always print:

```text
Planning ID: <planning-id>
Stage: <stage>
Current artifact: <artifact>
Problem definition: <problem-definition-path>
Solution exploration: <solution-exploration-path>
PRD: <prd-path>
Architecture: <architecture-path>
Dogfooding: <dogfooding-path>
Delivery: <delivery-path>
Blocking items:
- <item>
Next command: /dev-workflow-v2:continue-planning
```

If there are no blockers, print `Blocking items: none`.
