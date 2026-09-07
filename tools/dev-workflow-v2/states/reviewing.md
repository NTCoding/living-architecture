# REVIEWING State

The review bundle is launched automatically when the workflow enters this state. The required review agents run in parallel and record their verdicts into the workflow.

## TODO

- [ ] Wait for the review bundle to complete and its verdicts to be recorded
- [ ] If all required reviews passed: `/dev-workflow-v2:workflow transition SUBMITTING_PR`
- [ ] If any review failed: fix the issues found in the recorded review findings, commit, then `/dev-workflow-v2:workflow transition IMPLEMENTING`

## Constraints

- Cannot transition to SUBMITTING_PR unless architecture-review, code-review, and bug-scanner passed
- If `githubIssue` is present, cannot transition to SUBMITTING_PR unless the latest required `task-check` review also passed
- Cannot transition to IMPLEMENTING if all required reviews passed (architecture-review, code-review, bug-scanner, and `task-check` when `githubIssue` is present); go to SUBMITTING_PR instead
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
