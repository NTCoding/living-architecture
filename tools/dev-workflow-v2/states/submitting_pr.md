# SUBMITTING_PR State

You are creating or updating the pull request.

## TODO

- [ ] Push the branch: `git push -u origin <branch-name>`
- [ ] Create the PR: `gh pr create --title "<title>" --body "<description>"` (or update existing)
- [ ] Record the PR: `/dev-workflow-v2:workflow record-pr <PR_NUMBER> [PR_URL]`
- [ ] Transition to AWAITING_CI: `/dev-workflow-v2:workflow transition AWAITING_CI`

## Constraints

- `git push` and `gh pr` are ALLOWED in this state (exempted from the global block)
- Cannot transition to AWAITING_CI unless prNumber is recorded
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
