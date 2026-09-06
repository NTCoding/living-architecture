# SUBMITTING_PR State

You are creating a pull request.

## TODO

- [ ] Run `/dev-workflow-v2:create-pr` to create the PR with the workflow-owned standard format
- [ ] Transition to REVIEWING: `/dev-workflow-v2:workflow transition REVIEWING`

## Constraints

- `/dev-workflow-v2:create-pr` reads the recorded branch and issue, then delegates creation and recording to `workflow create-pr`.
- Do not call `git push`.
- Do not call `gh pr create`, `gh pr edit`, `gh pr ready`, or `workflow record-pr` directly.
- Cannot transition to REVIEWING unless the complete PR snapshot and local worktree match the verified commit
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
