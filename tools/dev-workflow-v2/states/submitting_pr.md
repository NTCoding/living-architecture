# SUBMITTING_PR State

You are creating or updating the pull request.

## TODO

- [ ] Run `/dev-workflow-v2:create-pr` to push the current branch and create the PR with the standard repo format
- [ ] Record the PR: `/dev-workflow-v2:workflow record-pr <PR_NUMBER> [PR_URL]`
- [ ] Transition to AWAITING_CI: `/dev-workflow-v2:workflow transition AWAITING_CI`

## Constraints

- `git push` and `gh pr` are ALLOWED in this state (exempted from the global block)
- Cannot transition to AWAITING_CI unless prNumber is recorded
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
