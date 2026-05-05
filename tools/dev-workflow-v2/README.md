# dev-workflow-v2

An event-sourced state machine plugin for Claude Code that enforces a structured task lifecycle: planning, implementation, verification, review, submit PR, await CI, await PR feedback, reflect, complete.

## How to Start

Start a new session in a worktree:

```bash
claude -w
```

Claude Code creates the worktree. The plugin owns everything from task selection onward.

## Commands

### Planning lifecycle

```bash
/dev-workflow-v2:start-planning <topic>
```

Creates the planning folder, marker, and problem definition file for a new planning topic.

```bash
/dev-workflow-v2:planning-status
```

Prints the active planning marker, current stage, derived artifact paths, blockers, and next command.

#### Planning marker

Planning topics use one folder per product planning topic at `docs/project/PRD/<slug>/`.

Derive `<slug>` from the planning topic by lowercasing it, replacing non-alphanumeric characters with hyphens, collapsing repeated hyphens, and trimming leading and trailing hyphens.

Each PRD folder stores all related planning files:

- marker: `docs/project/PRD/<slug>/marker.yml`
- problem definition: `docs/project/PRD/<slug>/problem-definition.md`
- solution exploration: `docs/project/PRD/<slug>/solution-exploration.md`
- PRD: `docs/project/PRD/<slug>/PRD.md`
- architecture: `docs/project/PRD/<slug>/ARCH.md`
- dogfooding: `docs/project/PRD/<slug>/dogfooding.md`
- delivery plan: `docs/project/PRD/<slug>/delivery.md`

The workflow selects the active planning marker from `docs/project/PRD/*/marker.yml`, where active means `stage != planning-complete`.

If there is exactly one active marker, `planning-status` and `continue-planning` use it.

If there is no active marker, `planning-status` and `continue-planning` stop, and `start-planning` can create the first one.

If there is more than one active marker, the planning commands stop and report all of them.

The marker stores only:

- `planningId`
- `stage`
- `githubMilestone`
- `githubIssuesCreated`
- `githubIssueNumbers`

Artifact paths are derived from `planningId`.

#### Planning stages

1. problem definition
2. solution exploration
3. PRD drafting as a product decision record
4. PRD approval
5. architecture drafting
6. architecture approval
7. dogfooding
8. delivery planning
9. task creation on GitHub
10. planning complete

The PRD is intentionally not where discovery happens. It records the product decision once `problem-definition.md` and `solution-exploration.md` are approved.

Solution exploration includes market/comparable/open-source research where relevant and a required review of Marty Cagan's four big product risks: value, usability, feasibility, and business viability.

Architecture remains after PRD approval, but architecture may return the workflow to `solution-exploration` or `prd-drafting` if feasibility invalidates product assumptions.

Dogfooding owns exact dogfooding deliverables before delivery planning. Delivery planning owns milestones, deliverables, dependencies, parallelisation, and task creation readiness.

#### Project memory

Planning commands use `project-memory/` as the persistent cross-PRD planning memory layer.

Project memory stores deferred ideas, future-work candidates, confirmed priorities, dependencies, and links to relevant research or implementation evidence.

Project memory also includes `project-memory/architecture/`, which stores approved reusable architectural reasoning for planning. Architecture memories use frontmatter for retrieval and human-readable body text for nuance. They are advisory, not automatic rules; when applicability is unclear, `continue-planning` must clarify with the user before relying on them.

When `continue-planning` identifies work that is out of scope for the current PRD, it triages whether the work is explicitly not needed, probably needed later, definitely needed later, or uncertain. Work that is probably or definitely needed later is captured under `project-memory/ideas/` rather than being lost inside the current PRD.

Completed work is not manually duplicated into project memory. Future planning should retrieve completed-work context from PRDs, git history, GitHub issues, GitHub PRs, and linked evidence.

```bash
/dev-workflow-v2:continue-planning
```

Checks the current planning stage once and advances only when the current artifact passes its checks.

### Planning to implementation bridge

```bash
/dev-workflow-v2:choose-next-task
```

Analyzes parallel work streams across approved delivery plans, including completed planning folders with open GitHub issues, recommends a task from a ready track, and assigns the issue after confirmation.

### Start implementation

```bash
/dev-workflow-v2:start-implementation <issue-number>
```

Renames the worktree branch to match the issue, reads the issue details, initializes the workflow state machine, and begins the IMPLEMENTING state.

### Workflow (internal)

```bash
/dev-workflow-v2:workflow <command>
```

Low-level state machine CLI. Used by the other commands and state instructions — not called directly by users.

Useful internal command for state-driven instructions:

```bash
/dev-workflow-v2:workflow get-state
```

This returns the current workflow state as JSON so state instructions can extract exact values such as `githubIssue`, `prNumber`, and `taskCheckPassed` without guessing.

## State Machine

```mermaid
stateDiagram-v2
    [*] --> IMPLEMENTING
    IMPLEMENTING --> REVIEWING
    REVIEWING --> SUBMITTING_PR : all reviews passed
    REVIEWING --> IMPLEMENTING : review failed
    SUBMITTING_PR --> AWAITING_CI
    AWAITING_CI --> AWAITING_PR_FEEDBACK : CI passed
    AWAITING_CI --> IMPLEMENTING : CI failed
    AWAITING_PR_FEEDBACK --> REFLECTING : no feedback
    AWAITING_PR_FEEDBACK --> ADDRESSING_FEEDBACK : feedback exists
    ADDRESSING_FEEDBACK --> REVIEWING
    REFLECTING --> COMPLETE
    COMPLETE --> [*]

    IMPLEMENTING --> BLOCKED
    REVIEWING --> BLOCKED
    SUBMITTING_PR --> BLOCKED
    AWAITING_CI --> BLOCKED
    AWAITING_PR_FEEDBACK --> BLOCKED
    ADDRESSING_FEEDBACK --> BLOCKED
    REFLECTING --> BLOCKED
    BLOCKED --> IMPLEMENTING : returns to pre-blocked state
```

## User Touchpoints

Most of the workflow is automated. You interact at these points:

1. **Choose task** — `/dev-workflow-v2:choose-next-task` recommends a task; confirm to proceed
2. **Start** — `/dev-workflow-v2:start-implementation <issue>` to begin
3. **Approve plan** — the agent presents an implementation plan for your approval
4. **Review PR** — after the agent creates a PR, review it on GitHub
5. **Merge** — merge the PR when satisfied

## Troubleshooting

| Problem                       | Where to look                                          |
| ----------------------------- | ------------------------------------------------------ |
| Workflow state seems wrong    | Event store: `~/.claude/workflow-events.db`            |
| Hook errors / silent failures | Error log: `~/.claude/dev-workflow-v2-hook-errors.log` |
| Stale NX cache                | Run `pnpm nx reset`                                    |
