# AWAITING_CI State

You are waiting for CI checks to complete on the PR.

## TODO

- [ ] Check CI status: `gh pr checks <PR_NUMBER>`
- [ ] Wait for all checks to complete — do not proceed while checks are pending
- [ ] If CI passes: `/dev-workflow-v2:workflow record-ci-passed`
- [ ] If CI fails: `/dev-workflow-v2:workflow record-ci-failed`
- [ ] If passed — transition to AWAITING_PR_FEEDBACK: `/dev-workflow-v2:workflow transition AWAITING_PR_FEEDBACK`
- [ ] If failed — transition back to IMPLEMENTING to fix: `/dev-workflow-v2:workflow transition IMPLEMENTING`

## Constraints

- Cannot transition to AWAITING_PR_FEEDBACK unless ciPassed is true
- Cannot transition to IMPLEMENTING if ciPassed is true (go to AWAITING_PR_FEEDBACK instead)
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
