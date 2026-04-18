# REVIEWING State

You are running automated code review by spawning review agents in parallel.

## Platform Detection

- [ ] Check whether the environment variable `OPENCODE=1` is present.
- [ ] If `OPENCODE=1` is present, you are in OpenCode mode:
  - use the Task tool to invoke the configured `architecture-review`, `code-review`, `bug-scanner`, and optional `task-check` subagents
  - do not write review reports or synthesize PASS/FAIL verdicts yourself unless subagent invocation fails
- [ ] Otherwise, use the Claude Agent tool path described below.

## TODO

- [ ] Determine changed files: `git diff --name-only $(git merge-base HEAD main)..HEAD`
- [ ] Create report directory: `reviews/<branch-name>/`
- [ ] Build agent prompts (see Prompt Construction below)
- [ ] If `OPENCODE=1`: spawn `architecture-review`, `code-review`, and `bug-scanner` in parallel using the Task tool
- [ ] Otherwise: spawn `architecture-review`, `code-review`, and `bug-scanner` in parallel using the Agent tool
- [ ] If `taskCheckPassed` is false AND a GitHub issue is recorded: also spawn `task-check` using the same platform-specific tool path (see Conditional Task Check below)
- [ ] Wait for all agents to complete and parse each agent's JSON verdict
- [ ] If task-check returned PASS: `/dev-workflow-v2:workflow record-task-check-passed`
- [ ] Record each agent's verdict individually:
  - `/dev-workflow-v2:workflow record-architecture-review-passed` or `record-architecture-review-failed`
  - `/dev-workflow-v2:workflow record-code-review-passed` or `record-code-review-failed`
  - `/dev-workflow-v2:workflow record-bug-scanner-passed` or `record-bug-scanner-failed`
- [ ] If all passed: `/dev-workflow-v2:workflow transition SUBMITTING_PR`
- [ ] If any failed: fix the issues found in the reports, commit, then `/dev-workflow-v2:workflow transition IMPLEMENTING`

## Prompt Construction

Each review agent prompt must include:

1. **Files to Review** — the changed files list from step 1
2. **Report Path** — `reviews/<branch-name>/<agent-name>.md`

Use the same prompt body for both platforms. In OpenCode mode, pass it to the Task tool for the named subagent. In Claude mode, pass it to the Agent tool with `subagent_type: "code-review"`.

Example prompt body:

```text
Files to Review:
- src/foo.ts
- src/bar.ts

Report Path: reviews/feat-my-feature/code-review.md
```

## Conditional Task Check

Check the workflow state's `taskCheckPassed` flag. If it is already `true`, skip the task-check agent (it passed in a previous review cycle).

If `taskCheckPassed` is `false` and a GitHub issue is recorded, spawn the task-check agent. In OpenCode mode use the Task tool for the `task-check` subagent. In Claude mode use the Agent tool with `subagent_type: "task-check"`. Its prompt must include:

1. **Files to Review** — same changed files list
2. **Report Path** — `reviews/<branch-name>/task-check.md`
3. **Task Details** — the GitHub issue body (fetch via `gh issue view <number>`)

## Constraints

- Cannot transition to SUBMITTING_PR unless all 3 reviews passed (architectureReviewPassed, codeReviewPassed, bugScannerPassed)
- Cannot transition to IMPLEMENTING if all 3 reviews passed (go to SUBMITTING_PR instead)
- Do not record any review PASS/FAIL status until the corresponding subagent has returned a JSON verdict
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
