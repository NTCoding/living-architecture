# ADDRESSING_FEEDBACK State

You are addressing PR review feedback.

## TODO

- [ ] Read each unresolved feedback thread
- [ ] For each thread, either:
  - Fix the issue and respond with what was changed
  - Reject with a specific technical reason (never "out of scope" or "nitpick")
- [ ] Respond to each thread: `pnpm nx run dev-workflow:respond-to-feedback -- --thread-id "<ID>" --action "fixed|rejected" --message "<explanation>"`
- [ ] Commit all fixes
- [ ] Record feedback addressed: `/dev-workflow-v2:workflow record-feedback-addressed`
- [ ] Transition to VERIFYING: `/dev-workflow-v2:workflow transition VERIFYING`

## Constraints

- Cannot transition to VERIFYING unless feedbackAddressed is true
- feedbackAddressed and feedbackClean reset on entry to this state
- Default to accepting feedback — reviewers know their codebase
- Every rejection MUST include a specific technical reason
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
