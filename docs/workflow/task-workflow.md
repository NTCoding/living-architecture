# Task Workflow

> **When to use this document:** Consult this when managing tasks or PRDs. Find your action in the table below, then follow the linked section.

## Lifecycle Steps

| Action | When |
|--------|------|
| [Create task](#creating-tasks) | New work identified |
| [Start task](#starting-work) | User says "start task" or "next task" |
| [Update task](#updating-tasks) | Acceptance criteria changed, new insights |
| [Complete task](#completing-tasks) | Work finished, ready for PR |
| [Activate PRD](#activating-a-prd) | Moving PRD to `active/` |
| [Archive PRD](#archiving-a-prd) | PRD complete |

---

## Creating Tasks

### From PRD Deliverables

Use the `/create-tasks` skill to generate well-formed task content:

```
/create-tasks
```

This skill:
- Validates task size (max 1 day, vertical slice)
- Applies INVEST criteria
- Ensures proper structure with context, acceptance criteria, dependencies
- Splits epics using SPIDR techniques

### Add to GitHub Issues

```bash
gh issue create \
  --title "[M1-D1] Task title" \
  --body "Task content from skill output" \
  --milestone "<milestone-name>"
```

**Title format:** `[M<milestone>-D<deliverable>] Description` for PRD tasks.

### Dependencies

If a task depends on another, note in the issue body: `Depends on #X`

GitHub automatically creates a link between issues.

---

## Starting Work

> **Branch Protection:** Direct pushes to `main` are blocked. All changes must go through pull requests.

### Find the Active Milestone

```bash
# List files in active PRD folder
ls docs/project/PRD/active/
# → PRD-phase-9-launch.md

# Milestone name = filename without PRD- and .md
# → phase-9-launch
```

### Find Next Task

```bash
# List unassigned issues (ordered by title = PRD order)
gh issue list --milestone "<milestone-name>" --state open --assignee ""
```

Propose the first issue to the user:

> Next task is #X: "Title". Start this task?

Wait for user confirmation before proceeding.

### Start Working

After user confirms:

```bash
# Assign the issue
gh issue edit <number> --add-assignee @me

# Create feature branch
git checkout -b issue-<number>-short-description

# Read issue details
gh issue view <number>
```

Read the issue body and related files (PRD, referenced code) before starting.

---

## Updating Tasks

### Edit Issue Body

```bash
gh issue edit <number> --body "Updated content"
```

### Add a Comment

```bash
gh issue comment <number> --body "New insight: ..."
```

---

## Completing Tasks

Follow all steps autonomously. Only notify the user when the PR is ready for review.

1. [Verify](#verify) — Run build, lint, test
2. [Task-check](#task-check) — Validate completion
3. [Create PR](#create-pr) — Commit, push, create PR
4. [Fix CI failures](#fix-ci-failures) — Address any SonarCloud issues
5. [Notify user](#notify-user) — PR ready for review

---

### Verify

```bash
pnpm nx run-many -t lint,typecheck,test
```

If any fail, fix and re-run before proceeding.

---

### Task-check

Run the task-check agent:

```
Use the Task tool with subagent_type "task-check:task-check". Provide:
1. Task ID: GitHub issue number
2. Task location: `gh issue view <number>`
3. Work summary: Files modified, changes made, decisions, what you skipped
4. Attempt: Which attempt (1, 2, or 3). Start with 1.
```

**Handle response:**

| STATUS | Action |
|--------|--------|
| PASS | Continue to [Create PR](#create-pr) |
| FAIL | Fix issues listed, re-run task-check (max 3 attempts) |
| NEED_INFO | If answerable from codebase, answer and re-run. Otherwise ask user. |

**After 3 failed attempts:** Stop and ask user for guidance.

---

### Create PR

```bash
# Commit
git add -A && git commit -m "feat(scope): description"

# Push
git push -u origin HEAD

# Create PR (auto-closes issue when merged)
gh pr create --title "feat(scope): description" --body "Closes #<number>"

# Wait for CI checks
gh pr checks --watch
```

If checks pass, proceed to [Notify user](#notify-user).

If SonarCloud fails, proceed to [Fix CI failures](#fix-ci-failures).

---

### Fix CI failures

Query SonarCloud issues:

```bash
curl -s "https://sonarcloud.io/api/issues/search?organization=nick-tune-org&projectKeys=NTCoding_living-architecture&pullRequest=$(gh pr view --json number -q .number)&severities=CRITICAL,BLOCKER,MAJOR" | jq '.issues[] | {rule: .rule, message: .message, file: .component, line: .line}'
```

Query security hotspots:

```bash
curl -s "https://sonarcloud.io/api/hotspots/search?organization=nick-tune-org&projectKey=NTCoding_living-architecture&pullRequest=$(gh pr view --json number -q .number)" | jq '.hotspots[] | {message: .message, file: .component, line: .line}'
```

Fix issues, commit, push:

```bash
git add -A && git commit -m "fix: address SonarCloud issues" && git push
```

Repeat until checks pass.

---

### Notify user

When all checks pass, tell the user:

> PR #X is ready for review: <PR URL>

The user will review and merge. The issue auto-closes when the PR is merged (via `Closes #<number>` in PR body).

---

## Activating a PRD

When moving a PRD from `notstarted/` to `active/`:

1. Move the file:
   ```bash
   git mv docs/project/PRD/notstarted/PRD-<name>.md docs/project/PRD/active/
   ```

2. Create the milestone (name = filename without `PRD-` and `.md`):
   ```bash
   gh api repos/NTCoding/living-architecture/milestones \
     --method POST \
     --field title="<name>" \
     --field description="See docs/project/PRD/active/PRD-<name>.md"
   ```

3. Commit:
   ```bash
   git add -A && git commit -m "chore: activate PRD <name>"
   ```

---

## Archiving a PRD

When a PRD is complete:

1. Move the file:
   ```bash
   git mv docs/project/PRD/active/PRD-<name>.md docs/project/PRD/archived/
   ```

2. Find the milestone number:
   ```bash
   gh api repos/NTCoding/living-architecture/milestones --jq '.[] | {number, title}'
   ```

3. Close the milestone:
   ```bash
   gh api repos/NTCoding/living-architecture/milestones/<number> --method PATCH --field state=closed
   ```

4. Commit:
   ```bash
   git add -A && git commit -m "chore: archive PRD <name>"
   ```
