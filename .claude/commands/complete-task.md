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
4. Wait for CI checks to complete
5. Report CI results to user (pass/fail, PR URL)

If any step fails, report the error. Do not attempt fixes without user input.

## After Initial Submission

When pushing updates to an existing PR:

1. Commit and push changes
2. Run `./scripts/submit-pr.sh --update`
3. Wait for CI checks to complete
4. Report CI results to user
