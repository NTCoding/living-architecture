# planning-status

Report the active planning topic.

## Workflow

1. Find the active planning marker in `docs/project/planning/*.yml`.
2. Stop if there is no active marker.
3. Stop if more than one active marker exists and list all of them.
4. Derive the PRD and architecture paths from `planningId`.
5. Print:
   - planning topic
   - current stage
   - PRD path
   - architecture path
   - whether tasks have been created
   - next command
   - blockers
