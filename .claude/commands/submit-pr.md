# Submit PR

Launch a Haiku sub-agent to create a PR (if needed) and watch CI checks. Generic and reusable—works with any GitHub repository.

## Usage

**First-time PR:** Use `/complete-task` which runs task-check and submit-pr automatically.

**Create new PR (if task-check already passed):**
```text
/submit-pr --title "PR title" --body "PR description" --did-you-run-task-check=yes
```

Example:
```text
/submit-pr --title "feat(auth): add OAuth2 login flow" --body "## Summary\n- Added OAuth2 provider\n- Integrated with existing auth middleware" --did-you-run-task-check=yes
```

**Update existing PR (re-check after fixes):**
```text
/submit-pr --update
```

**Note:** Commit and push your changes before running this command.

## Sub-agent Instructions

Use the Task tool with:
- `subagent_type`: `general-purpose`
- `model`: `haiku`

Prompt for the sub-agent:

```text
Submit a PR for the current branch and watch all CI checks until complete.

Arguments: $ARGUMENTS

## Precondition Check

1. Check for uncommitted changes: `git status --porcelain`
   - If output is not empty: STOP and return:
     "❌ Cannot submit: uncommitted changes detected. Commit and push your changes first."

## Determine Mode

2. If arguments contain "--update": this is an UPDATE (PR must exist)
   - Run: `gh pr view --json number,url`
   - If errors: STOP and return "❌ No PR exists for this branch. Use /submit-pr to create one."
   - If succeeds: skip to step 5

3. If arguments contain "--title": this is a CREATE
   - Check if "--did-you-run-task-check=yes" flag is present
   - If flag is MISSING: STOP and return:
     "⚠️ Initial PRs require task-check validation.

     Options:
     1. Run `/complete-task` (runs task-check + creates PR automatically)
     2. If task-check already passed, add the flag:
        /submit-pr --title \"...\" --body \"...\" --did-you-run-task-check=yes"

   - If flag is present: continue
   - Parse title from: --title "..."
   - Parse body from: --body "..." (may contain \n for newlines)
   - Check if PR exists: `gh pr view --json number,url 2>/dev/null`
   - If PR exists: STOP and return "❌ PR already exists. Use /submit-pr --update to re-check."
   - If no PR: continue to step 4

4. Create PR: `gh pr create --title "<title>" --body "<body>"`

## Watch and Report

5. Wait for CI to start: `sleep 5`

6. Watch checks: `gh pr checks --watch --fail-fast -i 30`

7. Get PR info: `gh pr view --json number,url`

8. Read PR comments: `gh pr view --comments`

## Return Format

### All checks pass:

| Check | Status |
|-------|--------|
| <name> | ✅ pass |
| ... | ... |

PR #<number> ready for review: <url>

### Checks failed or issues found:

❌ PR needs attention:

| Check | Status |
|-------|--------|
| <name> | ❌ fail |
| ... | ... |

## PR Comments:
<any bot comments about failures>

Fix issues and run /submit-pr --update again.

## Rules

- Do NOT attempt to fix issues. Only report.
- Do NOT skip `gh pr checks --watch`.
- Do NOT return until checks complete.
```
