# Complete Task

Run the complete-task pipeline to verify, review, and submit your work.

## Instructions

Run this command with a **10 minute timeout** (600000ms):

```bash
pnpm nx complete-task dev-workflow
```

This is a long-running command that:
- Runs local verification (lint, typecheck, test)
- Executes code review agents
- Submits PR and waits for CI checks

Parse the JSON response and follow the `nextInstructions` field exactly.
