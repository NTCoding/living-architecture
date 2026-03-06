# AWAITING_CI State

You are waiting for CI checks to complete on the PR.

## TODO

- [ ] Check CI status: `gh pr checks <PR_NUMBER>`
- [ ] Wait for all checks to complete — do not proceed while checks are pending
- [ ] If CI passes: `/dev-workflow-v2:workflow record-ci-passed`
- [ ] If CI fails: `/dev-workflow-v2:workflow record-ci-failed`
- [ ] If passed — transition to CHECKING_FEEDBACK: `/dev-workflow-v2:workflow transition CHECKING_FEEDBACK`
- [ ] If failed — transition back to IMPLEMENTING to fix: `/dev-workflow-v2:workflow transition IMPLEMENTING`

## Constraints

- Cannot transition to CHECKING_FEEDBACK unless ciPassed is true
- Cannot transition to IMPLEMENTING if ciPassed is true (go to CHECKING_FEEDBACK instead)
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
