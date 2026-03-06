# ADDRESSING_FEEDBACK State

You are addressing PR review feedback.

## TODO

- [ ] Read each unresolved feedback thread
- [ ] For each thread, either:
  - Fix the issue and respond with what was changed
  - Reject with a specific technical reason (never "out of scope" or "nitpick")
- [ ] Respond to each thread: `pnpm nx run dev-workflow:respond-to-feedback -- --thread-id "<ID>" --action "fixed|rejected" --message "<explanation>"`
- [ ] Commit all fixes
- [ ] Record feedback addressed with the count: `/dev-workflow-v2:workflow record-feedback-addressed <count>`
- [ ] Transition to REVIEWING: `/dev-workflow-v2:workflow transition REVIEWING`

## Constraints

- Cannot transition to REVIEWING unless feedbackAddressed is true
- The addressedCount must be >= the unresolvedCount from the previous CHECKING_FEEDBACK state
- feedbackAddressed and feedbackClean reset on entry to this state
- Default to accepting feedback — reviewers know their codebase
- Every rejection MUST include a specific technical reason
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
