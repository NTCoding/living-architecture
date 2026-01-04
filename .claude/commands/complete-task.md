# Complete Task

Verify task completion and submit PR.

## Usage

```text
/complete-task
```

## Instructions

1. Run verify gate: `pnpm nx run-many -t lint,typecheck,test`
2. Run task-check agent to validate completion
3. If task-check passes: commit, push, then run `./scripts/submit-pr.sh --title "..." --body "..."`
4. Report results to user

If any step fails, report the error. Do not attempt fixes without user input.
