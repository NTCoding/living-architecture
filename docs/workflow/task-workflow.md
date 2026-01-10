# Task Workflow

> **MANDATORY:** Follow these instructions exactly. Do not run git/gh commands directly.

## Goal

Work through the entire lifecycle autonomously until you have a mergeable PR or are blocked. Present the user with a completed pull request that is green and ready for review.

*CRUCIAL*: Do not stop to ask the user for permission to do steps you are empowered to do autonomously. Never ask things like "Ready for /complete-task ?" - just do it if you have autonomy as defined in the table below.

## Git Worktrees

By default, `start-task.sh` creates a git worktree in a sibling directory (e.g., `../living-architecture-issue-40-desc/`). This allows working on multiple tasks in parallel without stashing or switching branches.

- Use `--no-worktree` to create a branch in the current repo instead
- Use `--no-issue=<name>` for ad-hoc tasks without a GitHub issue
- After the PR is merged, run `cleanup-task.sh` from within the worktree to remove it

## Lifecycle Steps

Autonomous = you can do this without user permission. Do not ask for permission, just do it.

| Step | Command | Permission |
|------|---------|------------|
| Create Tasks | `/create-tasks` | **User confirmation required** |
| List Milestone Tasks | `./scripts/list-tasks.sh` | Autonomous |
| List Non-Milestone Tasks | `./scripts/list-tasks.sh --ideas\|--bugs\|--tech` | Autonomous |
| Start Task | `./scripts/start-task.sh <issue-number>` | **User confirmation required** |
| Amend Task | `./scripts/amend-task.sh <issue-number> "Amendment"` | Autonomous |
| Complete Task | `/complete-task` | Autonomous |
| Re-check PR | `/complete-task` | Autonomous |
| Post-Merge Completion | `/post-merge-completion` | Autonomous |
| Activate PRD | `./scripts/activate-prd.sh <prd-name>` | **User confirmation required** |
| Archive PRD | `./scripts/archive-prd.sh <prd-name>` | **User confirmation required** |

---

## Task Types

### Milestone Tasks (PRD-driven)

Work tied to a Product Requirements Document and tracked via GitHub milestones.

- **List:** `./scripts/list-tasks.sh`
- **Create:** `./scripts/create-task.sh`
- **When:** Breaking down PRD deliverables into implementable tasks

### Non-Milestone Tasks

Independent work not tied to a PRD. Three categories:

| Type | Label | List Command |
|------|-------|--------------|
| Ideas | `idea` | `./scripts/list-tasks.sh --ideas` |
| Bugs | `bug` | `./scripts/list-tasks.sh --bugs` |
| Tech Improvements | `tech improvement` | `./scripts/list-tasks.sh --tech` |

- **Create:** `./scripts/create-tech-improvement-task.sh` (applies appropriate label)
- **When:** Fixes, refactoring, tech debt, performance, exploratory work

---

## Task Creation

**MANDATORY:** All tasks MUST be created using approved scripts. Never use `gh issue create` or GitHub UI directly.

### PRD Task

```bash
./scripts/create-task.sh <milestone> <title> <body>
```

Body must contain all 10 sections (see `/create-tasks` skill documentation).

### Tech Improvement Task

```bash
./scripts/create-tech-improvement-task.sh \
  <title> \
  <references> \
  <summary> \
  <full-details> \
  <acceptance-criteria>
```

Parameters:
- `title` - Concise task title
- `references` - GitHub issues (#123), PRs (#456), or explanation of origin
- `summary` - One paragraph: what and why
- `full-details` - Implementation approach, affected files, architectural context
- `acceptance-criteria` - Checkboxes defining "done"

---

## When to Use Each Step

**Create Tasks** — New work identified from a PRD. Break down deliverables into tasks.

**List Tasks** — User says "next task" or asks what's available:
- Milestone tasks: `./scripts/list-tasks.sh`
- Non-milestone: `./scripts/list-tasks.sh --ideas|--bugs|--tech`

Propose the first task to the user and ask them to confirm. Once confirmed, start the task (which provides the details), then create a plan. Do not create a plan before starting.

**Start Task** — User has confirmed they want to begin a specific task. Run this FIRST—it provides the issue details needed for planning. Do not create a plan or fetch issue details separately before running this script. Creates a git worktree by default.

**Amend Task** — Requirements changed or need clarification during development.

**Complete Task** — Implementation done, tests passing. Runs the complete autonomous pipeline: verify gate, code review, task-check, and PR submission.

**Re-check PR** — PR feedback addressed, needs CI verification. Run `/complete-task` again to re-run the full pipeline.

**Post-Merge Completion** — After PR is merged: (1) Run `/post-merge-completion` from the worktree to reflect on feedback (needs review files). (2) Create GitHub issues for any improvement opportunities identified. (3) Run `cleanup-task.sh` to remove the worktree. (4) Implement improvements by starting the new task via normal workflow—**never reuse the merged branch** (squash merges create stale merge bases).

**Activate PRD** — Moving a PRD from not started to active.

**Archive PRD** — All tasks in a PRD complete. Close the milestone.
