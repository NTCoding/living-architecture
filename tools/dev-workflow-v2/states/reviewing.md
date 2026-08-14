# REVIEWING State

You are running automated code review by spawning review agents in parallel.

## TODO

- [ ] Run `/dev-workflow-v2:code-review` to run and record the required review bundle
- [ ] If all required reviews passed: `/dev-workflow-v2:workflow transition SUBMITTING_PR`
- [ ] If any review failed: fix the issues found in the recorded review findings, commit, then `/dev-workflow-v2:workflow transition IMPLEMENTING`

## Constraints

- Cannot transition to SUBMITTING_PR unless architecture-review, code-review, and bug-scanner passed
- If `githubIssue` is present, cannot transition to SUBMITTING_PR unless the latest required `task-check` review also passed
- Cannot transition to IMPLEMENTING if all required reviews passed (architecture-review, code-review, bug-scanner, and `task-check` when `githubIssue` is present); go to SUBMITTING_PR instead
- `/dev-workflow-v2:code-review` reads workflow state, invokes the required reviewers, and records valid review payloads.
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
