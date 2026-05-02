# planning-status

Report the active planning topic.

## Workflow

1. Find the active planning marker in `docs/project/planning/*.yml`.
2. Stop if there is no active marker.
3. Stop if more than one active marker exists and list all of them.
4. Derive the PRD path from `planningId` with `docs/project/PRD/active/PRD-${planningId}.md`.
5. Derive the architecture path from `planningId` with `docs/project/architecture/active/ARCH-${planningId}.md`.
6. Print:
   - planning topic
   - planningId
   - current stage
   - PRD path
   - architecture path
   - whether tasks have been created
   - next command
   - blockers

## Next command mapping

| Current stage | Next command |
| --- | --- |
| `prd-drafting` | `/dev-workflow-v2:continue-planning` |
| `prd-approval` | `/dev-workflow-v2:continue-planning` |
| `architecture-drafting` | `/dev-workflow-v2:continue-planning` |
| `architecture-approval` | `/dev-workflow-v2:continue-planning` |
| `task-creation` | `/dev-workflow-v2:continue-planning` |
| `planning-complete` | `/dev-workflow-v2:choose-next-task` |
