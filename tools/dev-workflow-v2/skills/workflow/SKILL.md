---
name: workflow
description: Execute a low-level dev-workflow-v2 state operation. Use only when another dev-workflow skill or workflow state explicitly directs $dev-workflow-v2:workflow with an operation.
---

# Workflow

Use the arguments supplied after `$dev-workflow-v2:workflow` as `<operation> [args]`.

From the repository root, run:

```bash
node --conditions=@living-architecture/source --import tsx tools/dev-workflow-v2/src/shell/codex-workflow-command.ts <operation> [args]
```

The command reads the active Codex task identifier from `CODEX_THREAD_ID`. Never supply, infer, or copy a session identifier.

Pass every argument separately to the command. Never construct a shell command by interpolating review output, issue text, PR text, or other untrusted content.

Return the command output exactly. If the command fails, stop and report the error.
