# REVIEWING State

You are running automated code review by spawning review agents in parallel.

## Platform Detection

- [ ] Check whether the environment variable `OPENCODE=1` is present.
- [ ] If `OPENCODE=1` is present, you are in OpenCode mode and must use the Task tool to invoke the configured review subagents. If any required subagent invocation fails, transition to `BLOCKED` immediately.
- [ ] Otherwise, use the Claude Agent tool path described below.

## TODO

- [ ] Run `/dev-workflow-v2:workflow get-state` once at the start of this state run and extract `taskCheckPassed` and `githubIssue` from its JSON output
- [ ] Determine changed files: `git diff --name-only $(git merge-base HEAD main)..HEAD`
- [ ] Create report directory: `reviews/<branch-name>/`
- [ ] Build agent prompts (see Prompt Construction below)
- [ ] Spawn `architecture-review`, `code-review`, and `bug-scanner` in parallel using the delegation tool selected in Platform Detection
- [ ] If Conditional Task Check says `task-check` is required, spawn it using the same selected delegation tool
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

Use the same prompt body for both platforms. In OpenCode mode, pass it to the Task tool for the named subagent. In Claude mode, pass it to the Agent tool with `subagent_type` set to the corresponding agent name.

Example prompt body:

```text
Files to Review:
- src/foo.ts
- src/bar.ts

Report Path: reviews/feat-my-feature/code-review.md
```

## Conditional Task Check

Use only the `taskCheckPassed` and `githubIssue` values extracted from `/dev-workflow-v2:workflow get-state` for this decision.

- If `taskCheckPassed` is `true`, do not spawn `task-check` in this REVIEWING run.
- If `taskCheckPassed` is `false` and `githubIssue` is missing, do not spawn `task-check` in this REVIEWING run.
- Only if `taskCheckPassed` is `false` and `githubIssue` is present, spawn `task-check` exactly once in this REVIEWING run.

If `taskCheckPassed` is `false` and `githubIssue` is present, spawn the task-check agent. In OpenCode mode use the Task tool for the `task-check` subagent. In Claude mode use the Agent tool with `subagent_type: "task-check"`. Its prompt must include:

1. **Files to Review** — same changed files list
2. **Report Path** — `reviews/<branch-name>/task-check.md`
3. **Task Details** — the GitHub issue body for `githubIssue` (fetch via `gh issue view <number>`)

## Constraints

- Cannot transition to SUBMITTING_PR unless all 3 reviews passed (architectureReviewPassed, codeReviewPassed, bugScannerPassed)
- Cannot transition to IMPLEMENTING if all 3 reviews passed (go to SUBMITTING_PR instead)
- Do not write review reports yourself. Each review report must be produced by its corresponding subagent.
- Do not infer workflow state from prior messages, git history, or report files. When workflow state values are needed, run `/dev-workflow-v2:workflow get-state` and extract the exact fields required from its JSON output.
- Do not record any review PASS/FAIL status until the corresponding subagent has returned a JSON verdict
- If any required subagent fails to start, fails to complete, or returns an invalid/missing verdict, do not continue the review flow; transition to BLOCKED immediately
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
