# REVIEWING State

You are running automated code review by spawning review agents in parallel.

## Platform Detection

- [ ] Check whether the environment variable `OPENCODE=1` is present.
- [ ] If `OPENCODE=1` is present, you are in OpenCode mode and must use the Task tool to invoke the configured review subagents. If any required subagent invocation fails, transition to `BLOCKED` immediately.
- [ ] Otherwise, use the Claude Agent tool path described below.

## TODO

- [ ] Run `/dev-workflow-v2:workflow get-state` once at the start of this state run and extract `taskCheckPassed` and `githubIssue` from its JSON output
- [ ] Determine changed files: `git diff --name-only $(git merge-base HEAD main)..HEAD`
- [ ] Build agent prompts (see Prompt Construction below)
- [ ] Spawn `architecture-review`, `code-review`, and `bug-scanner` in parallel using the delegation tool selected in Platform Detection
- [ ] If Conditional Task Check says `task-check` is required, spawn it using the same selected delegation tool
- [ ] Wait for all agents to complete and parse each agent's JSON review payload
- [ ] For each valid review payload, record it with `/dev-workflow-v2:workflow record-review --type <review-type>` and pass the review JSON through stdin
- [ ] If all passed: `/dev-workflow-v2:workflow transition SUBMITTING_PR`
- [ ] If any failed: fix the issues found in the recorded review findings, commit, then `/dev-workflow-v2:workflow transition IMPLEMENTING`

## Prompt Construction

Each review agent prompt must include:

1. **Files to Review** — the changed files list from step 1

Use the same prompt body for both platforms. In OpenCode mode, pass it to the Task tool for the named subagent. In Claude mode, pass it to the Agent tool with `subagent_type` set to the corresponding agent name.

Each review agent must return JSON with:

1. `verdict` — `PASS` or `FAIL`
2. `summary` — one sentence
3. `findings` — array, `[]` for `PASS`

Example prompt body:

```text
Files to Review:
- src/foo.ts
- src/bar.ts
```

## Conditional Task Check

Use only the `taskCheckPassed` and `githubIssue` values extracted from `/dev-workflow-v2:workflow get-state` for this decision.

- If `taskCheckPassed` is `true`, do not spawn `task-check` in this REVIEWING run.
- If `taskCheckPassed` is `false` and `githubIssue` is missing, do not spawn `task-check` in this REVIEWING run.
- Only if `taskCheckPassed` is `false` and `githubIssue` is present, spawn `task-check` exactly once in this REVIEWING run.

If `taskCheckPassed` is `false` and `githubIssue` is present, spawn the task-check agent. In OpenCode mode use the Task tool for the `task-check` subagent. In Claude mode use the Agent tool with `subagent_type: "task-check"`. Its prompt must include:

1. **Files to Review** — same changed files list
2. **Task Details** — the GitHub issue body for `githubIssue` (fetch via `gh issue view <number>`)

## Constraints

- Cannot transition to SUBMITTING_PR unless architecture-review, code-review, and bug-scanner passed
- If `githubIssue` is present, cannot transition to SUBMITTING_PR unless the latest required `task-check` review also passed
- Cannot transition to IMPLEMENTING if all 3 reviews passed (go to SUBMITTING_PR instead)
- Do not infer workflow state from prior messages or git history. When workflow state values are needed, run `/dev-workflow-v2:workflow get-state` and extract the exact fields required from its JSON output.
- Do not record any review until the corresponding subagent has returned valid JSON with `verdict`, `summary`, and `findings`
- If any required subagent fails to start, fails to complete, or returns invalid or missing review JSON, do not continue the review flow; transition to BLOCKED immediately
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
