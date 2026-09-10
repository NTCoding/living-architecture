# REVIEWING State

Run the four review agents in parallel: `architecture-review`, `code-review`, `bug-scanner`, and `task-check`. Give each agent its definition from `agents/<reviewer>.md`, the pull request number from workflow state, and the changed files. The agents publish findings and approvals directly to GitHub.

After every agent has finished, transition to `REVIEWING` again. The workflow then reads the GitHub review record, records the statuses, and moves to `ADDRESSING_FEEDBACK` or `HUMAN_REVIEWING` when all required feedback is available.

## Constraints

- Do not use ACP to run reviewers.
- Do not record reviewer status yourself.
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
