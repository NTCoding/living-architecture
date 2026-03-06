# REVIEWING State

You are performing code review on the implementation.

## TODO

- [ ] Review all changed files against project conventions (`docs/conventions/software-design.md`)
- [ ] Check the separation of concerns audit (`development-skills:separation-of-concerns`)
- [ ] Verify test quality and coverage meets conventions (`docs/conventions/testing.md`)
- [ ] Check for anti-patterns (`docs/conventions/anti-patterns.md`)
- [ ] If review passes: `/dev-workflow-v2:workflow record-review-passed`
- [ ] If review fails: fix the issues, commit, then `/dev-workflow-v2:workflow record-review-failed`
- [ ] If passed — transition to SUBMITTING_PR: `/dev-workflow-v2:workflow transition SUBMITTING_PR`
- [ ] If failed — transition back to IMPLEMENTING: `/dev-workflow-v2:workflow transition IMPLEMENTING`

## Constraints

- Cannot transition to SUBMITTING_PR unless reviewPassed is true
- Cannot transition to IMPLEMENTING if reviewPassed is true (go to SUBMITTING_PR instead)
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
