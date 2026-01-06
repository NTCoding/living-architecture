# Task Workflow

> **MANDATORY:** Follow these instructions exactly. Do not run git/gh commands directly.

## Goal

Work through the entire lifecycle autonomously until you have a mergeable PR or are blocked. Present the user with a completed pull request that is green and ready for review.

*CRUCIAL*: Do not stop to ask the user for permissiom to do steps you are empowered to do autonomously.

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
| Activate PRD | `./scripts/activate-prd.sh <prd-name>` | **User confirmation required** |
| Archive PRD | `./scripts/archive-prd.sh <prd-name>` | **User confirmation required** |

---

## When to Use Each Step

**Create Tasks** — New work identified from a PRD. Break down deliverables into tasks.

**List Tasks** — User says "next task" or asks what's available. Run the script, propose the first task to the user, and ask them to confirm. Once confirmed, start the task (which provides the details), then create a plan. Do not create a plan before starting.

**Start Task** — User has confirmed they want to begin a specific task. Run this FIRST—it provides the issue details needed for planning. Do not create a plan or fetch issue details separately before running this script.

**Amend Task** — Requirements changed or need clarification during development.

**Complete Task** — Implementation done, tests passing. Runs the complete autonomous pipeline: verify gate, code review, task-check, and PR submission.

**Re-check PR** — PR feedback addressed, needs CI verification. Run `/complete-task` again to re-run the full pipeline.

**Activate PRD** — Moving a PRD from not started to active.

**Archive PRD** — All tasks in a PRD complete. Close the milestone.
