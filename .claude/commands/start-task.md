# Start Task

Launch a Haiku sub-agent to set up the working environment for a GitHub issue.

## Usage

```text
/start-task <issue-number>
```

## Sub-agent Instructions

Use the Task tool with:
- `subagent_type`: `general-purpose`
- `model`: `haiku`

Prompt for the sub-agent:

```text
Set up the working environment for GitHub issue #$ARGUMENTS.

## Steps

1. Check current branch: `git branch --show-current`
2. If NOT on `main`, switch: `git checkout main`
3. Pull latest: `git pull origin main`
4. Get issue title: `gh issue view $ARGUMENTS --json title -q .title`
5. Create branch: `git checkout -b issue-$ARGUMENTS-<short-description>`
   - Derive short description from title (lowercase, hyphens, max 30 chars)
6. Assign issue: `gh issue edit $ARGUMENTS --add-assignee @me`
7. Get full issue with comments: `gh issue view $ARGUMENTS --comments`

## Return Format

Branch: <branch-name>

<full output from gh issue view --comments>

Ready to begin work.

## On Error

If any step fails, return the error details. Do not attempt to fix—just report.
```
