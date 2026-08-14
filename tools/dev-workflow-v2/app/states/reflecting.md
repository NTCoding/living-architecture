# REFLECTING State

You are writing a reflection on the completed work before finishing.

## TODO

- [ ] Run `/dev-workflow-v2:workflow get-reflection-process` to get the reflection context and output schema
- [ ] Analyse the PR feedback, review cycles, and implementation decisions
- [ ] Build a reflection JSON payload that matches the schema returned by `get-reflection-process`
- [ ] Record the reflection with the platform-provided route: `/dev-workflow-v2:workflow record-reflection` using that JSON payload on stdin
- [ ] Transition to COMPLETE: `/dev-workflow-v2:workflow transition COMPLETE`

## Constraints

- Use the platform-provided `record-reflection` route; do not add a workflow-specific reflection recording command
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
