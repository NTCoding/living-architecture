# REVIEWING State

You are running automated code review by spawning review agents in parallel.

## TODO

- [ ] Determine changed files: `git diff --name-only $(git merge-base HEAD main)..HEAD`
- [ ] Create report directory: `reviews/<branch-name>/`
- [ ] Build agent prompts (see Prompt Construction below)
- [ ] Spawn `architecture-review`, `code-review`, and `bug-scanner` agents in parallel using the Agent tool
- [ ] If `taskCheckPassed` is false AND a GitHub issue is recorded: also spawn `task-check` agent (see Conditional Task Check below)
- [ ] Wait for all agents to complete and parse each agent's JSON verdict
- [ ] If task-check returned PASS: `/dev-workflow-v2:workflow record-task-check-passed`
- [ ] If **all** agents returned PASS: `/dev-workflow-v2:workflow record-review-passed`
- [ ] If **any** agent returned FAIL: `/dev-workflow-v2:workflow record-review-failed <failed-agent-names...>`
- [ ] If passed: `/dev-workflow-v2:workflow transition SUBMITTING_PR`
- [ ] If failed: fix the issues found in the reports, commit, then `/dev-workflow-v2:workflow transition IMPLEMENTING`

## Prompt Construction

Each review agent prompt must include:

1. **Files to Review** — the changed files list from step 1
2. **Report Path** — `reviews/<branch-name>/<agent-name>.md`

Example prompt for spawning via the Agent tool with `subagent_type: "code-review"`:

```text
Files to Review:
- src/foo.ts
- src/bar.ts

Report Path: reviews/feat-my-feature/code-review.md
```

## Conditional Task Check

Check the workflow state's `taskCheckPassed` flag. If it is already `true`, skip the task-check agent (it passed in a previous review cycle).

If `taskCheckPassed` is `false` and a GitHub issue is recorded, spawn the task-check agent with `subagent_type: "task-check"`. Its prompt must include:

1. **Files to Review** — same changed files list
2. **Report Path** — `reviews/<branch-name>/task-check.md`
3. **Task Details** — the GitHub issue body (fetch via `gh issue view <number>`)

## Constraints

- Cannot transition to SUBMITTING_PR unless reviewPassed is true
- Cannot transition to IMPLEMENTING if reviewPassed is true (go to SUBMITTING_PR instead)
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
