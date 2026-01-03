# Submit PR

Launch a Haiku sub-agent to create a PR (if needed) and watch CI checks. Generic and reusable—works with any GitHub repository.

## Usage

**Create new PR:**
```
/submit-pr "title"
```
Example: `/submit-pr "feat(auth): add OAuth2 login flow"`

**Update existing PR (re-check after fixes):**
```
/submit-pr --update
```

**Note:** Commit and push your changes before running this command.

## Sub-agent Instructions

Use the Task tool with:
- `subagent_type`: `general-purpose`
- `model`: `haiku`

Prompt for the sub-agent:

```
Submit a PR for the current branch and watch all CI checks until complete.

Arguments: $ARGUMENTS

## Precondition Check

1. Check for uncommitted changes: `git status --porcelain`
   - If output is not empty: STOP and return:
     "❌ Cannot submit: uncommitted changes detected. Commit and push your changes first."

## Determine Mode

2. If arguments contain "--update": this is an UPDATE (PR must exist)
   - Run: `gh pr view --json number,url`
   - If errors: STOP and return "❌ No PR exists for this branch. Use /submit-pr \"title\" to create one."
   - If succeeds: skip to step 5

3. If arguments contain a title (not --update): this is a CREATE
   - Check if PR exists: `gh pr view --json number,url 2>/dev/null`
   - If PR exists: STOP and return "❌ PR already exists. Use /submit-pr --update to re-check."
   - If no PR: continue to step 4

4. Create PR: `gh pr create --title "<title from arguments>" --body ""`

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
