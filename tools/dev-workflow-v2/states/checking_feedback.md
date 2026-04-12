# CHECKING_FEEDBACK State

You are checking the PR for review feedback from humans and bots.

Feedback is **automatically fetched** on entry to this state. The workflow records either feedback-clean or feedback-exists with an unresolved count. Run `/dev-workflow-v2:list-review-threads` to inspect the current unresolved threads in a structured format before deciding what to do next.

## TODO

- [ ] Review the auto-fetched feedback result (check workflow state for feedbackClean / feedbackUnresolvedCount)
- [ ] Run `/dev-workflow-v2:list-review-threads` if feedback exists or a structured review summary is needed
- [ ] If clean — transition to REFLECTING: `/dev-workflow-v2:workflow transition REFLECTING`
- [ ] If feedback exists — transition to ADDRESSING_FEEDBACK: `/dev-workflow-v2:workflow transition ADDRESSING_FEEDBACK`

## Constraints

- Cannot transition to REFLECTING unless feedbackClean is true
- Cannot transition to ADDRESSING_FEEDBACK if feedbackClean is true (go to REFLECTING instead)
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
