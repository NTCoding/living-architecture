---
name: dev-workflow-start-implementation
description: Start implementation for a GitHub issue in this repository. Use only when the user explicitly invokes $dev-workflow-start-implementation with an issue number.
---

# Start Implementation

Use the supplied issue number. Follow the canonical procedure in `tools/dev-workflow-v2/commands/start-implementation.md` exactly, with this Codex-specific replacement for its two Claude workflow commands:

```bash
npx tsx "$(git rev-parse --show-toplevel)/tools/dev-workflow-v2/src/shell/codex-workflow-command.ts" init
npx tsx "$(git rev-parse --show-toplevel)/tools/dev-workflow-v2/src/shell/codex-workflow-command.ts" record-issue <issue-number>
```

The shared command reads Codex's `CODEX_THREAD_ID`. Do not read a session ID from hook output or substitute any other value.
