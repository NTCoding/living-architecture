# CHECKING_FEEDBACK State

You are checking the PR for review feedback from humans and bots.

## TODO

- [ ] Check PR feedback: `pnpm nx run dev-workflow:get-pr-feedback`
- [ ] Review all unresolved threads and comments
- [ ] If no unresolved feedback: `/dev-workflow-v2:workflow record-feedback-clean`
- [ ] If unresolved feedback exists: `/dev-workflow-v2:workflow record-feedback-exists`
- [ ] If clean — transition to REFLECTING: `/dev-workflow-v2:workflow transition REFLECTING`
- [ ] If feedback exists — transition to ADDRESSING_FEEDBACK: `/dev-workflow-v2:workflow transition ADDRESSING_FEEDBACK`

## Constraints

- Cannot transition to REFLECTING unless feedbackClean is true
- Cannot transition to ADDRESSING_FEEDBACK if feedbackClean is true (go to REFLECTING instead)
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
