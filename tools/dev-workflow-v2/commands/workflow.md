# workflow

Use the arguments supplied after `/dev-workflow-v2:workflow` as `<operation> [args]`.

Run the Claude workflow adapter:

```bash
CLAUDE_PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}" CLAUDE_SESSION_ID="${CLAUDE_SESSION_ID}" npx tsx "${CLAUDE_PLUGIN_ROOT}/src/shell/cli.ts" ${(Q)${(z)ARGUMENTS}}
```
