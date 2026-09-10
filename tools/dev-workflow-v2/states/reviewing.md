# REVIEWING State

First get the workflow state. Continue only when `currentStateMachineState` is `REVIEWING`.

Run the four review agents in parallel: `architecture-review`, `code-review`, `bug-scanner`, and `task-check`. Give each agent its definition from `agents/<reviewer>.md`, the pull request number from workflow state, and the changed files.

## Pi

Use the `subagent` tool once, with one `workflowScript` containing `runs.all`. It must launch these four fresh-context child agents in parallel:

- `architecture-review`
- `code-review`
- `bug-scanner`
- `task-check`

Each child task must include the pull request number and the changed-file list. Set `async: false` so the parent waits for every child. The agents publish findings and approvals directly to GitHub.

## Other harnesses

Run the same four agents in parallel using the harness's supported subagent mechanism. Give each agent its definition, the pull request number, and changed files. The agents publish findings and approvals directly to GitHub.

After every agent has finished, transition to `REVIEWING` again. The workflow then reads the GitHub review record, records the statuses, and moves to `ADDRESSING_FEEDBACK` or `HUMAN_REVIEWING` when all required feedback is available.

## Constraints

- Do not use ACP to run reviewers.
- Do not record reviewer status yourself.
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
