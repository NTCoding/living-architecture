# code-review

Run and record the required workflow review bundle.

## Usage

```bash
/dev-workflow-v2:code-review
```

## Instructions

1. Check whether `OPENCODE=1` is present. Use the Task tool for configured review subagents in OpenCode; otherwise use the Claude Agent tool with the corresponding `subagent_type`.
2. Read `/dev-workflow-v2:workflow get-state` and extract `currentStateMachineState`, `taskCheckPassed`, and `githubIssue`. Stop unless the state is `REVIEWING`.
3. Determine changed files against the merge base with `main`: `git diff --name-only $(git merge-base HEAD main)..HEAD`.
4. Stop if no files changed.
5. Build the same `Files to Review` prompt for `architecture-review`, `code-review`, and `bug-scanner`.
6. If `taskCheckPassed` is false and `githubIssue` is present, add the issue body to the same prompt and run `task-check` too.
7. Run the required review agents in parallel.
8. Wait for each agent, validate its JSON payload (`verdict`, `summary`, and `findings`), and record every valid payload with `/dev-workflow-v2:workflow record-review <review-type> '<review-json>'`.
9. If a required agent fails to run or returns invalid JSON, stop and transition to `BLOCKED`.
10. Return a concise summary of the changed files and recorded verdicts.

## Prompt Format

Each agent prompt must use this structure:

```text
Files to Review:
- path/to/file.ts
- path/to/other-file.ts
```

## Scope

- This command owns reviewer invocation and recording their valid workflow review payloads.
- Do not transition workflow state when every review completes.
