# start-implementation

Start implementing a task. Sets up the branch and initializes the workflow state machine.

## Arguments

The user provides a **GitHub issue number** — e.g. `#123` or `123`.

## Step 1: Set up the branch

The session is already in a worktree (started via `claude -w`). Rename the auto-generated worktree branch to match our convention:

```bash
# Get latest main
git fetch origin main

# Build the branch name from the issue
ISSUE_TITLE=$(gh issue view <N> --json title -q .title)
# lowercase, replace non-alphanum with hyphens, collapse, trim, max 30 chars
SHORT_DESC=$(echo "$ISSUE_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-30)

git branch -m "issue-<N>-${SHORT_DESC}"
```

## Step 2: Read the issue

```bash
gh issue view <N>
```

Summarize the requirements from the issue body.

## Step 3: Initialize the workflow

```bash
/dev-workflow-v2:workflow init
```

This registers your session with the workflow engine and loads the IMPLEMENTING state instructions.

Record the issue immediately:

```bash
/dev-workflow-v2:workflow record-issue <N>
```

## Step 4: Follow the state machine

After init, read the state instruction file that the workflow loads. It will guide you through:

1. **IMPLEMENTING** — Read requirements, plan, implement, test, commit
2. **REVIEWING** — Spawn review agents, record each verdict individually
3. **SUBMITTING_PR** — Push branch, create PR, record PR number
4. **AWAITING_CI** — Wait for CI, record result
5. **CHECKING_FEEDBACK** — Check PR for review comments
6. **REFLECTING** — Write a reflection on the work
7. **COMPLETE** — Done

Each state's instruction file tells you exactly what to do and which workflow commands to run. Follow them.
