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
| List Tasks | `./scripts/list-tasks.sh` | Autonomous |
| Start Task | `./scripts/start-task.sh <issue-number>` | **User confirmation required** |
| Amend Task | `./scripts/amend-task.sh <issue-number> "Amendment"` | Autonomous |
| Complete Task | `/complete-task` | Autonomous |
| Re-check PR | `/complete-task` | Autonomous |
| Post-Merge Completion | `/post-merge-completion` | Autonomous |
| Activate PRD | `./scripts/activate-prd.sh <prd-name>` | **User confirmation required** |
| Archive PRD | `./scripts/archive-prd.sh <prd-name>` | **User confirmation required** |

---

## When to Use Each Step

**Create Tasks** — New work identified from a PRD. Break down deliverables into tasks.

**List Tasks** — User says "next task" or asks what's available. Run the script, propose the first task to the user, and ask them to confirm. Once confirmed, start the task (which provides the details), then create a plan. Do not create a plan before starting.

**Start Task** — User has confirmed they want to begin a specific task. Run this FIRST—it provides the issue details needed for planning. Do not create a plan or fetch issue details separately before running this script. Creates a git worktree by default.

**Amend Task** — Requirements changed or need clarification during development.

**Complete Task** — Implementation done, tests passing. Runs the complete autonomous pipeline: verify gate, code review, task-check, and PR submission.

**Re-check PR** — PR feedback addressed, needs CI verification. Run `/complete-task` again to re-run the full pipeline.

**Post-Merge Completion** — After PR is merged, run `/post-merge-completion` to reflect on feedback and implement process improvements. **Never reuse the merged branch** (squash merges create stale merge bases). Create a fresh branch from main for any follow-up changes, push improvements, and create a new PR. Only run `cleanup-task.sh` after all follow-up PRs are merged.

**Activate PRD** — Moving a PRD from not started to active.

**Archive PRD** — All tasks in a PRD complete. Close the milestone.
