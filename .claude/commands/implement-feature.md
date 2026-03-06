# implement-feature

Start a new feature implementation using the dev-workflow-v2 state machine.

## Step 1: Get task context

The user provides one of:
- **GitHub issue number** — e.g. `#123` or `123`
- **Ad-hoc instructions** — free-form description of what to build

If the argument is an issue number, read it with `gh issue view <number>` and summarize the requirements. If ad-hoc instructions, confirm understanding before proceeding.

## Step 2: Initialize the workflow

```bash
/dev-workflow-v2:workflow init
```

This registers your session with the workflow engine and loads the IMPLEMENTING state instructions.

If the user provided a GitHub issue, record it immediately:

```bash
/dev-workflow-v2:workflow record-issue <ISSUE_NUMBER>
```

## Step 3: Follow the state machine

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
