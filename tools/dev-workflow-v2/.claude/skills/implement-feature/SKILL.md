---
name: implement-feature
description: Start a new feature implementation using the dev-workflow-v2 state machine. Use when starting a task, implementing a feature, or running the full verify/review/PR/CI cycle.
disable-model-invocation: true
---

# implement-feature

You are starting a new feature implementation using the dev-workflow-v2 state machine.

## Step 1: Initialize the workflow

```bash
/dev-workflow-v2:workflow init
```

This registers your session with the workflow engine and loads the IMPLEMENTING state instructions.

## Step 2: Follow the state machine

After init, read the state instruction file that the workflow loads. It will guide you through:

1. **IMPLEMENTING** — Read requirements, plan, implement, test, commit
2. **VERIFYING** — Run `pnpm verify`, record result
3. **REVIEWING** — Spawn review agents, record result
4. **SUBMITTING_PR** — Push branch, create PR, record PR number
5. **AWAITING_CI** — Wait for CI, record result
6. **CHECKING_FEEDBACK** — Check PR for review comments
7. **REFLECTING** — Write a reflection on the work
8. **COMPLETE** — Done

Each state's instruction file tells you exactly what to do and which workflow commands to run. Follow them.

## When to use this command

- Starting a new task from a GitHub issue
- Picking up work that needs the full implementation pipeline
- Any time you need the workflow to enforce the verify -> review -> PR -> CI -> feedback cycle
