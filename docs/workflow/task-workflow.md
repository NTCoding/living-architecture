# Task Workflow

> **MANDATORY:** Follow these instructions exactly. Do not run git/gh commands directly.

## Goal

Work through the entire lifecycle autonomously until you have a mergeable PR or are blocked. Present the user with a completed pull request that is green and ready for review.

*CRUCIAL*: Do not stop to ask the user for permission to do steps you are empowered to do autonomously. Never ask things like "Ready for /complete-task ?" - just do it if you have autonomy as defined in the table below.

## Git Worktrees

By default, `start-task.sh` creates a git worktree in a sibling directory (e.g., `../living-architecture-issue-40-desc/`). This allows working on multiple tasks in parallel without stashing or switching branches.

- Use `--no-worktree` to create a branch in the current repo instead
- Use `--no-issue=<name>` for ad-hoc tasks without a GitHub issue
- After the PR is merged, run `pnpm nx run dev-workflow:merge-and-cleanup` from within the worktree

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
| Complete Task (create) | `/complete-task` with `--prmode create` | Autonomous |
| Complete Task (update) | `/complete-task` with `--prmode update` | Autonomous |
| Check PR Feedback | `pnpm nx run dev-workflow:get-pr-feedback` | Autonomous |
| Re-check PR | `/complete-task` with `--prmode update` | Autonomous |
| Pre-Merge Reflection | `/pre-merge-reflection` | Autonomous |
| Merge and Cleanup | `pnpm nx run dev-workflow:merge-and-cleanup` | **User-only (blocked for Claude)** |
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

**Read Task References** — After starting a task and receiving the issue details, read ALL documents referenced in the task body BEFORE creating a plan:
- **Context section:** Read the PRD file at the path specified (e.g., `docs/project/PRD/active/PRD-phase-12-connection-detection.md`)
- **Traceability section:** Read the specific PRD sections referenced (e.g., M1-D1.1, §9.1.2)
- **Implementation Guidelines:** Read architecture decisions referenced (e.g., "see §9.1.2") and convention docs (e.g., `docs/conventions/software-design.md`)
- **Dependencies:** Check referenced issues for context on what already exists

Do not create a plan until you have read and understood these referenced documents. The task body contains file paths specifically so you can navigate to the source material.

**Amend Task** — Requirements changed or need clarification during development.

**Complete Task** — Implementation done, tests passing. Runs the complete autonomous pipeline: verify gate, code review, task-check, and PR submission. Use `--prmode create` for first submission, `--prmode update` after addressing feedback.

**Check PR Feedback** — Get current PR status and unresolved feedback. Use this to see what needs addressing before a PR is mergeable.

**Responding to PR Feedback** — When responding to unresolved threads:

🚨 **Every rejection MUST include a specific technical reason.** Blanket dismissals are forbidden.

- ❌ **NEVER**: "Not addressing in this PR", "CodeRabbit nitpick", "Out of scope"
- ✅ **ALWAYS**: Explain *why* the feedback doesn't apply with a specific technical justification

**Rules for rejecting feedback:**
1. If the feedback is about code **changed in this PR**, you MUST either fix it or explain with a specific technical reason why the suggestion is incorrect
2. If the feedback is about **pre-existing issues in files you are modifying**, fix them. Code quality and alignment with conventions is the highest priority — it doesn't matter if the issue was pre-existing. If we see it in a file we're touching, we fix it.
3. "Not addressing in this PR" is only valid for pre-existing issues in files **not modified by this PR**
4. "Nitpick" is not a rejection reason — evaluate the suggestion on its technical merits
5. If you cannot articulate a specific technical reason for rejection, the feedback is probably valid — fix it

**Re-check PR** — PR feedback addressed, needs CI verification. Run `/complete-task` with `--prmode update`. All feedback must be resolved in a single pass — each round-trip costs ~10 minutes (CI + review cycle).

**Pre-Merge Reflection** — When the PR is mergeable, run `/pre-merge-reflection` to generate a reflection report analyzing all feedback. This must happen **before** merging. Claude gathers local review files and GitHub feedback, writes the reflection, commits it, and presents it for discussion. After discussion, tell the user to run `pnpm nx run dev-workflow:merge-and-cleanup`.

**Merge and Cleanup** — **User-only command** (blocked for Claude). Merges the PR (squash), removes the worktree and Claude permissions. Gates on the reflection file existing — will fail if `/pre-merge-reflection` hasn't been run. After cleanup, implement any improvement tasks via normal workflow — **never reuse the merged branch** (squash merges create stale merge bases).

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

---

## Complete Task Modes

`/complete-task` has two modes, specified via `--prmode`:

### Create Mode (`--prmode create`)

First-time PR submission. Requires `--pr-title` when not derived from issue/task details. Fails if a PR already exists for the branch.

```bash
pnpm nx run dev-workflow:complete-task -- --prmode create --pr-title "feat: add feature"
```

### Update Mode (`--prmode update`)

Re-submission after addressing PR feedback. Requires `--feedback-items-resolved` and `--feedback-items-remaining`.

```bash
pnpm nx run dev-workflow:complete-task -- --prmode update --feedback-items-resolved 5 --feedback-items-remaining 0
```

**`--feedback-items-remaining` must be 0.** The pipeline rejects updates with unresolved feedback. Fix ALL feedback items in a single pass before re-submitting — each round-trip costs ~10 minutes (CI checks + code review cycle).

---

## Complete Task Failure Recovery

When `/complete-task` fails, follow this flowchart **exactly**. No guessing, no retrying blindly.

```text
/complete-task failed
    │
    ▼
Run: pnpm nx run dev-workflow:get-pr-feedback
    │
    ├── feedbackCount > 0?
    │   YES → Fix each feedback item, respond-to-feedback, re-run /complete-task
    │   NO  ↓
    │
    ├── CHANGES_REQUESTED review exists?
    │   YES → All threads resolved?
    │         YES → BLOCKED: Tell user "All checks complete, all feedback
    │                addressed, blocked by stale CHANGES_REQUESTED review
    │                from <reviewer>."
    │         NO  → Resolve remaining threads, re-run /complete-task
    │   NO  ↓
    │
    ├── mergeableState !== "clean"?
    │   YES → Read the failedStep log file from complete-task output.
    │         The log contains the SPECIFIC error (e.g. which CI check
    │         failed and why). Fix the root cause. Re-run /complete-task.
    │   NO  ↓
    │
    └── mergeable === true?
        YES → Something else went wrong. Report exact error to user.
        NO  → Report exact mergeableState and blocking reason to user.
```

**Rules:**
- NEVER retry `/complete-task` without first running `get-pr-feedback` to understand the current state
- NEVER guess what failed — read the log file or the feedback output
- NEVER wait for external processes without evidence they haven't completed yet — check first, then wait only if checks are genuinely pending

---

## Stop Checklist

Before stopping, verify ALL of the following:

- [ ] Are you stopping because you think you need user permission? Check the Permission column in the Lifecycle Steps table — if the step is "Autonomous", just do it. Do NOT stop to ask.
- [ ] Is there a mergeable PR? Run `pnpm nx run dev-workflow:get-pr-feedback` and verify `mergeable=true`.
- [ ] Have ALL unresolved threads been responded to? Use `respond-to-feedback` for each thread.
- [ ] Have you resolved ALL feedback items before re-running `/complete-task`? (`--feedback-items-remaining` must be 0)

Your response MUST start with one of:

1. `[Mergeable PR]` — Green CI, no unresolved feedback, verified via `get-pr-feedback`
2. `[No Mergeable PR: <reason>]` — Blocked or not working on a PR (e.g. CI failing, awaiting user input, not a feature task)

### Proof of mergeability

When claiming `[Mergeable PR]`, you MUST:

1. Paste the **full JSON output** from `pnpm nx run dev-workflow:get-pr-feedback`
2. Explain in 1-2 sentences why this PR is safe to stop on (e.g. "mergeable=true, 0 unresolved threads, CI green")

Do NOT summarize or paraphrase the output. Paste the raw JSON so the user can verify.
