# Task Workflow

> **MANDATORY:** Follow these instructions exactly. The dev-workflow-v2 state machine enforces the lifecycle — defer to its state instructions for each phase.

## Goal

Work through the entire lifecycle autonomously until you have a mergeable PR or are blocked. Present the user with a completed pull request that is green and ready for review.

*CRUCIAL*: Do not stop to ask the user for permission to do steps you are empowered to do autonomously. Never ask things like "Ready to submit?" — just do it if the state machine allows it.

## Getting Started

Start a new session in a worktree:

```bash
claude -w
```

### 1. Choose a Task

```bash
/dev-workflow-v2:choose-next-task
```

Analyzes parallel work streams across active PRDs, recommends a task from an idle track. Propose the recommendation to the user and ask them to confirm.

### 2. Start Implementation

```bash
/dev-workflow-v2:start-implementation <issue-number>
```

Renames the worktree branch, reads issue details, initializes the state machine, and enters the IMPLEMENTING state. From here, the state machine drives the workflow.

## Workflow Reference

The state machine defines every phase from implementation through to completion. See `tools/dev-workflow-v2/README.md` for the state diagram and user touchpoints.

State instructions: `tools/dev-workflow-v2/states/`
Commands: `tools/dev-workflow-v2/commands/`

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

Types: `idea`, `bug`, `tech`

### Amend Task

```bash
./scripts/amend-task.sh <issue-number> "Amendment"
```

## Task Types

### Milestone Tasks (PRD-driven)

Work tied to a Product Requirements Document and tracked via GitHub milestones.

- **List:** `gh issue list --milestone "<milestone>" --state open --json number,title,assignees,body,labels`
- **Create:** `./scripts/create-task.sh`

### Non-Milestone Tasks

Independent work not tied to a PRD. Three categories:

| Type | Label | List Command |
|------|-------|--------------|
| Ideas | `idea` | `gh issue list --label "idea" --no-milestone --state open --json number,title,assignees,body,labels` |
| Bugs | `bug` | `gh issue list --label "bug" --no-milestone --state open --json number,title,assignees,body,labels` |
| Tech Improvements | `tech improvement` | `gh issue list --label "tech improvement" --no-milestone --state open --json number,title,assignees,body,labels` |

## Responding to PR Feedback

🚨 **Every rejection MUST include a specific technical reason.** Blanket dismissals are forbidden.

- ❌ **NEVER**: "Not addressing in this PR", "CodeRabbit nitpick", "Out of scope"
- ✅ **ALWAYS**: Explain *why* the feedback doesn't apply with a specific technical justification

**Rules:**
1. Feedback about code **changed in this PR** — fix it or explain with a specific technical reason why the suggestion is incorrect
2. Pre-existing issues in files **you are modifying** — fix them. Code quality is the highest priority
3. "Not addressing in this PR" is only valid for pre-existing issues in files **not modified by this PR**
4. "Nitpick" is not a rejection reason — evaluate the suggestion on its technical merits
5. If you cannot articulate a specific technical reason for rejection, the feedback is probably valid — fix it

## Merge and Cleanup

Merging is the **user's decision**. After the workflow reaches COMPLETE:

1. The agent informs the user where the reflection file was written
2. The user commits/pushes the reflection if desired
3. The user merges: `gh pr merge --squash`
4. The user cleans up the worktree

**Never reuse a merged branch** — squash merges create stale merge bases.

## Parallel Work Streams

PRDs can define parallel tracks in their Parallelization section (Section 10). The `/dev-workflow-v2:choose-next-task` command uses this to recommend tasks that don't conflict with ongoing work.

Track definitions use YAML format in the PRD. See `docs/conventions/prd-track-format.md` for the schema.

## PRD Management

| Operation | Command | Permission |
|-----------|---------|------------|
| Activate PRD | `./scripts/activate-prd.sh <prd-name>` | **User confirmation required** |
| Archive PRD | `./scripts/archive-prd.sh <prd-name>` | **User confirmation required** |
