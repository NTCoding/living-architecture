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

```text
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

> **Branch Protection:** Direct pushes to `main` are blocked. All changes must go through pull requests. Before ANY code changes or planning, you MUST be on a feature branch. If you're on `main`, create a branch first.

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
# Pull latest from main
git checkout main && git pull origin main

# Create feature branch FIRST
git checkout -b issue-<number>-short-description

# Assign the issue
gh issue edit <number> --add-assignee @me

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

### After Plan Discussions

When plan discussions with the user change requirements, scope, or approach:

1. Update the GitHub issue body immediately:
   ```bash
   gh issue edit <number> --body "Updated requirements..."
   ```

2. Ensure acceptance criteria reflect the agreed changes

This keeps the issue as the single source of truth for reviewers.

---

## Completing Tasks

> **CRITICAL:** A task is not complete until a PR exists and passes checks. Do not stop or ask the user until you reach "Notify user" step.

Follow all steps autonomously. Only notify the user when the PR is ready for review.

1. [Verify](#verify) — Run build, lint, test
2. [Task-check](#task-check) — Validate completion
3. [Create PR](#create-pr) — Commit, push, create PR
4. [Address PR feedback](#address-pr-feedback) — Fix CodeRabbit comments, SonarCloud issues, CI failures
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

# Wait for CI checks (REQUIRED - do not skip)
gh pr checks --watch --fail-fast -i 30
```

**You MUST run `gh pr checks --watch`** — this blocks until all CI checks complete.

🚫 **NEVER** use `sleep && gh pr checks` patterns. The `--watch` flag handles waiting.

**When checks pass:** Proceed to [Address PR feedback](#address-pr-feedback) — CodeRabbit comments may exist even when checks pass.

**When checks fail:** Proceed to [Address PR feedback](#address-pr-feedback) — the PR comments contain what failed.

---

### Address PR feedback

> **CRITICAL:** Read PR comments FIRST. Bot comments (SonarCloud, CodeRabbit) explain exactly what failed. Do not investigate logs or query APIs until you've read the comments.

#### Step 1: Read PR comments

```bash
gh pr view <number> --comments
```

Look for:
- **SonarCloud Quality Gate** — Shows coverage %, duplications, issues blocking the gate
- **CodeRabbit review** — Shows code review comments

The comments tell you exactly what to fix. Read them before doing anything else.

#### Step 2: CodeRabbit line comments

```bash
gh api repos/NTCoding/living-architecture/pulls/<number>/comments --jq '.[] | select(.user.login | contains("coderabbitai")) | {file: .path, line: .line, body: .body}'
```

Fix valid issues. For nitpicks or disagreements, reply explaining your reasoning (don't dismiss — leave visible for user review).

#### Step 3: SonarCloud details (if needed)

The PR comment shows coverage % and what's blocking the Quality Gate. If you need specific file/line details:

```bash
curl -s "https://sonarcloud.io/api/issues/search?organization=nick-tune-org&projectKeys=NTCoding_living-architecture&pullRequest=$(gh pr view --json number -q .number)&severities=CRITICAL,BLOCKER,MAJOR" | jq '.issues[] | {rule: .rule, message: .message, file: .component, line: .line}'
```

Query security hotspots:

```bash
curl -s "https://sonarcloud.io/api/hotspots/search?organization=nick-tune-org&projectKey=NTCoding_living-architecture&pullRequest=$(gh pr view --json number -q .number)" | jq '.hotspots[] | {message: .message, file: .component, line: .line}'
```

Fix all reported issues. For false positives, ask the user.

#### Step 4: Commit and re-check

After addressing feedback:

```bash
git add -A && git commit -m "fix: address PR feedback" && git push
sleep 5  # Wait for CI to pick up new commit
gh pr checks --watch --fail-fast -i 30
```

Repeat Steps 1-4 until all checks pass with no new comments.

---

### Notify user

When all feedback is addressed and checks pass, tell the user:

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
     --field description="See https://github.com/NTCoding/living-architecture/blob/main/docs/project/PRD/active/PRD-<name>.md"
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
