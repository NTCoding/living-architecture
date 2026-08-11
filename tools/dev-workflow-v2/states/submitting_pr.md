# SUBMITTING_PR State

You are creating a pull request.

## TODO

- [ ] Run `/dev-workflow-v2:create-pr` to push the recorded feature branch and create the PR with the workflow-owned standard format
- [ ] Transition to AWAITING_CI: `/dev-workflow-v2:workflow transition AWAITING_CI`

## Constraints

- `/dev-workflow-v2:create-pr` reads the recorded branch and issue, then delegates creation and recording to `workflow create-pr`.
- Do not call `gh pr create`, `gh pr edit`, `gh pr ready`, or `workflow record-pr` directly.
- Cannot transition to AWAITING_CI unless prNumber is recorded
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
