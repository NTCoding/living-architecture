# Complete Task

Run the complete-task pipeline to verify, review, and submit your work.

## Modes

### First submission (create)

```bash
pnpm nx run dev-workflow:complete-task -- --prmode create --pr-title "feat(scope): title"
```

Fails if a PR already exists for this branch.

### Re-submission after feedback (update)

```bash
pnpm nx run dev-workflow:complete-task -- --prmode update --feedback-items-resolved <N> --feedback-items-remaining 0
```

Fails if:
- No PR exists for this branch
- `--feedback-items-remaining` is greater than 0 — fix ALL feedback first to avoid 10min round-trip costs

Use `--reject-review-feedback` to skip code review (only valid in update mode).

## Instructions

Run with a **10-minute timeout** (600000ms Bash tool timeout). Output is written to `reviews/{branch}/output.json`.

```bash
export GITHUB_TOKEN=$(gh auth token) && pnpm nx run dev-workflow:complete-task -- [args] 2>&1; BRANCH=$(git branch --show-current) && cat "reviews/${BRANCH}/output.json"
```

If the workflow errors before context is built, check `reviews/error-output.json` instead.

This is a long-running command that:
- Runs local verification (lint, typecheck)
- Executes code review agents
- Submits/updates PR and waits for CI checks

Parse the JSON response and follow the `nextInstructions` field exactly.
