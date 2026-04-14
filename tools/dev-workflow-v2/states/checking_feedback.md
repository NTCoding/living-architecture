# CHECKING_FEEDBACK State

You are checking the PR for review feedback from humans and bots.

Feedback is **automatically fetched** on entry to this state. The workflow queries `gh pr view --json reviewThreads`, filters unresolved threads, and records the result as either feedback-clean or feedback-exists with an unresolved count.

## TODO

- [ ] Review the auto-fetched feedback result (check workflow state for feedbackClean / feedbackUnresolvedCount)
- [ ] If clean — transition to REFLECTING: `/dev-workflow-v2:workflow transition REFLECTING`
- [ ] If feedback exists — transition to ADDRESSING_FEEDBACK: `/dev-workflow-v2:workflow transition ADDRESSING_FEEDBACK`

## Constraints

- Cannot transition to REFLECTING unless feedbackClean is true
- Cannot transition to ADDRESSING_FEEDBACK if feedbackClean is true (go to REFLECTING instead)
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
