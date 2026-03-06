# REFLECTING State

You are writing a reflection on the completed work before finishing.

## TODO

- [ ] Analyse the PR feedback, review cycles, and implementation decisions
- [ ] Write a reflection document covering: what went well, what could improve, key decisions and their rationale
- [ ] Save the reflection to a file (e.g., `reviews/<branch>/reflection.md`)
- [ ] Record the reflection: `/dev-workflow-v2:workflow record-reflection "<path-to-reflection>"`
- [ ] Transition to COMPLETE: `/dev-workflow-v2:workflow transition COMPLETE`

## Constraints

- Cannot transition to COMPLETE unless reflectionPath is recorded
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
