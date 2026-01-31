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
| Next Task (parallel-aware) | `/next-task` | Autonomous |
| List Tasks (JSON) | `pnpm nx list-tasks dev-workflow` | Autonomous |
| List Non-Milestone Tasks | `pnpm nx list-tasks dev-workflow -- --ideas` (or `--bugs`, `--tech`) | Autonomous |
| Start Task | `./scripts/start-task.sh <issue-number>` | **User confirmation required** |
| Amend Task | `./scripts/amend-task.sh <issue-number> "Amendment"` | Autonomous |
| Complete Task | `/complete-task` | Autonomous |
| Check PR Feedback | `pnpm nx run dev-workflow:get-pr-feedback` | Autonomous |
| Re-check PR | `/complete-task` | Autonomous |
| Post-Merge Completion | `/post-merge-completion` | Autonomous |
| Activate PRD | `./scripts/activate-prd.sh <prd-name>` | **User confirmation required** |
| Archive PRD | `./scripts/archive-prd.sh <prd-name>` | **User confirmation required** |

---

## Task Types

### Milestone Tasks (PRD-driven)

Work tied to a Product Requirements Document and tracked via GitHub milestones.

- **List:** `pnpm nx list-tasks dev-workflow`
- **Create:** `./scripts/create-task.sh`
- **When:** Breaking down PRD deliverables into implementable tasks

### Non-Milestone Tasks

Independent work not tied to a PRD. Three categories:

| Type | Label | List Command |
|------|-------|--------------|
| Ideas | `idea` | `pnpm nx list-tasks dev-workflow -- --ideas` |
| Bugs | `bug` | `pnpm nx list-tasks dev-workflow -- --bugs` |
| Tech Improvements | `tech improvement` | `pnpm nx list-tasks dev-workflow -- --tech` |

- **Create:** `./scripts/create-non-milestone-task.sh --type <idea|bug|tech>`
- **When:** Fixes, refactoring, tech debt, performance, exploratory work

---

## Task Creation

**MANDATORY:** All tasks MUST be created using approved scripts. Never use `gh issue create` or GitHub UI directly.

### PRD Task

```bash
./scripts/create-task.sh <milestone> <title> <body>
```

Body must contain all 10 sections (see `/create-tasks` skill documentation).

### Non-Milestone Task

```bash
./scripts/create-non-milestone-task.sh --type <idea|bug|tech> \
  <title> \
  <references> \
  <summary> \
  <full-details> \
  <acceptance-criteria>
```

Parameters:
- `--type` - Task type: `idea`, `bug`, or `tech`
- `title` - Concise task title
- `references` - GitHub issues (#123), PRs (#456), or explanation of origin
- `summary` - One paragraph: what and why
- `full-details` - Implementation approach, affected files, architectural context
- `acceptance-criteria` - Checkboxes defining "done"

---

## When to Use Each Step

**Create Tasks** — New work identified from a PRD. Break down deliverables into tasks.

**Next Task** — User says "next task", "what's next?", or asks what to work on:
- Run `/next-task` to analyze work streams and recommend from idle tracks
- Considers parallel work streams defined in PRD Parallelization sections
- Falls back to non-milestone tasks when all tracks are busy
- See [Parallel Work Streams](#parallel-work-streams) for details

**List Tasks** — Query raw task data (used by `/next-task` internally):
- All tasks: `pnpm nx list-tasks dev-workflow` (outputs JSON with milestone + non-milestone tasks)
- Specific type: `pnpm nx list-tasks dev-workflow -- --ideas` (or `--bugs`, `--tech`)

Propose a task to the user and ask them to confirm. Once confirmed, start the task (which provides the details), then create a plan. Do not create a plan before starting.

**Start Task** — User has confirmed they want to begin a specific task. Run this FIRST—it provides the issue details needed for planning. Do not create a plan or fetch issue details separately before running this script. Creates a git worktree by default.

**Amend Task** — Requirements changed or need clarification during development.

**Complete Task** — Implementation done, tests passing. Runs the complete autonomous pipeline: verify gate, code review, task-check, and PR submission.

**Check PR Feedback** — Get current PR status and unresolved feedback. Use this to see what needs addressing before a PR is mergeable.

**Responding to PR Feedback** — When responding to unresolved threads:

🚨 **Every rejection MUST include a specific technical reason.** Blanket dismissals are forbidden.

- ❌ **NEVER**: "Not addressing in this PR", "CodeRabbit nitpick", "Out of scope"
- ✅ **ALWAYS**: Explain *why* the feedback doesn't apply with a specific technical justification

**Rules for rejecting feedback:**
1. If the feedback is about code **changed in this PR**, you MUST either fix it or explain with a specific technical reason why the suggestion is incorrect
2. "Not addressing in this PR" is only valid for pre-existing issues unrelated to the PR's changes
3. "Nitpick" is not a rejection reason — evaluate the suggestion on its technical merits
4. If you cannot articulate a specific technical reason for rejection, the feedback is probably valid — fix it

**Re-check PR** — PR feedback addressed, needs CI verification. Run `/complete-task` again to re-run the full pipeline.

**Post-Merge Completion** — After PR is merged: (1) Run `/post-merge-completion` from the worktree to reflect on feedback (needs review files). (2) Create GitHub issues for any improvement opportunities identified. (3) Run `cleanup-task.sh` to remove the worktree. (4) Implement improvements by starting the new task via normal workflow—**never reuse the merged branch** (squash merges create stale merge bases).

**Activate PRD** — Moving a PRD from not started to active.

**Archive PRD** — All tasks in a PRD complete. Close the milestone.

---

## Parallel Work Streams

PRDs can define parallel tracks in their Parallelization section (Section 10). The `/next-task` command uses this to recommend tasks that don't conflict with ongoing work.

### How It Works

1. Runs `pnpm nx list-tasks dev-workflow` to get tasks from all active PRD milestones
2. Reads active PRD(s) from `docs/project/PRD/active/`
3. Parses YAML track definitions in the Parallelization section (see `docs/conventions/prd-track-format.md`)
4. Maps tasks to tracks via deliverable references in task body
5. Identifies busy tracks (tasks with assignees)
6. Recommends task from idle track first
7. Falls back to non-milestone tasks when all tracks are busy

### Track Mapping

Tasks reference deliverables in their body text:

- `PRD Section: M2.3` — Milestone 2, Deliverable 3
- `Traceability: M2-D3` — Milestone 2, Deliverable 3
- `Deliverable: D3.1` — Deliverable 3.1
- `Research-R1` — Research track

These references map to tracks defined in the PRD Parallelization section as YAML:

```yaml
tracks:
  - id: A
    name: Extraction
    deliverables: [M1, M2, D3.3, M5]
  - id: B
    name: Conventions
    deliverables: [D3.1, D3.2, D4.1]
  - id: C
    name: Research
    deliverables: [R1]
```

### PRDs Without YAML Track Definitions

If a PRD lacks YAML track definitions in its Parallelization section, `list-tasks` will throw an error indicating which PRD needs track definitions added. See `docs/conventions/prd-track-format.md` for the required format.
