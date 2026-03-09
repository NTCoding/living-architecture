# workflow-hook

`workflow-hook` guards Claude Code tool usage at the workflow entrypoint boundary.

- Keep it in workflow hook command surfaces such as `tools/dev-workflow-v2/src/entrypoint/` and `tools/dev-workflow/features/claude-hooks/commands/`.
- Use it to translate tool calls into workflow precondition checks.
- Do not move domain state transitions or CLI and GitHub process execution into this role.
