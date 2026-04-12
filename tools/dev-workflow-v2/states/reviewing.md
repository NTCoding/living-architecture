# REVIEWING State

You are running automated code review by spawning review agents in parallel.

## TODO

- [ ] Run `/dev-workflow-v2:code-review` to review the current branch and write reports to `reviews/<branch-name>/`
- [ ] If `taskCheckPassed` is false AND a GitHub issue is recorded: also spawn `task-check` agent (see Conditional Task Check below)
- [ ] Parse the `/dev-workflow-v2:code-review` verdicts for `architecture-review`, `code-review`, and `bug-scanner`
- [ ] If task-check returned PASS: `/dev-workflow-v2:workflow record-task-check-passed`
- [ ] Record each agent's verdict individually:
  - `/dev-workflow-v2:workflow record-architecture-review-passed` or `record-architecture-review-failed`
  - `/dev-workflow-v2:workflow record-code-review-passed` or `record-code-review-failed`
  - `/dev-workflow-v2:workflow record-bug-scanner-passed` or `record-bug-scanner-failed`
- [ ] If all passed: `/dev-workflow-v2:workflow transition SUBMITTING_PR`
- [ ] If any failed: fix the issues found in the reports, commit, then `/dev-workflow-v2:workflow transition IMPLEMENTING`

## Conditional Task Check

Check the workflow state's `taskCheckPassed` flag. If it is already `true`, skip the task-check agent (it passed in a previous review cycle).

If `taskCheckPassed` is `false` and a GitHub issue is recorded, spawn the task-check agent with `subagent_type: "task-check"`. Its prompt must include:

1. **Files to Review** — the current branch's changed files
2. **Report Path** — `reviews/<branch-name>/task-check.md`
3. **Task Details** — the GitHub issue body (fetch via `gh issue view <number>`)

## Constraints

- Cannot transition to SUBMITTING_PR unless all 3 reviews passed (architectureReviewPassed, codeReviewPassed, bugScannerPassed)
- Cannot transition to IMPLEMENTING if all 3 reviews passed (go to SUBMITTING_PR instead)
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
