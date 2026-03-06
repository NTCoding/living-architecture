# VERIFYING State

You are running the full verification gate on your implementation.

## TODO

- [ ] Run `pnpm verify` to execute lint, build, typecheck, test, and knip across the monorepo
- [ ] If verify passes: `/dev-workflow-v2:workflow record-verify-passed`
- [ ] If verify fails: fix the errors, commit, then `/dev-workflow-v2:workflow record-verify-failed`
- [ ] If passed — transition to REVIEWING: `/dev-workflow-v2:workflow transition REVIEWING`
- [ ] If failed — transition back to IMPLEMENTING: `/dev-workflow-v2:workflow transition IMPLEMENTING`

## Constraints

- Cannot transition to REVIEWING unless verifyPassed is true
- Cannot transition to IMPLEMENTING if verifyPassed is true (go to REVIEWING instead)
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
