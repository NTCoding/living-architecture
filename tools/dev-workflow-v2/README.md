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

Creates the planning marker and PRD file for a new planning topic.

```bash
/dev-workflow-v2:planning-status
```

Prints the active planning marker, current stage, derived artifact paths, blockers, and next command.

```bash
/dev-workflow-v2:continue-planning
```

Checks the current planning stage once and advances only when the current artifact passes its checks.

### Planning to implementation bridge

```bash
/dev-workflow-v2:choose-next-task
```

Analyzes parallel work streams across active PRDs, recommends a task from an idle track, and assigns the issue after confirmation.

### Start implementation

```bash
/dev-workflow-v2:start-implementation <issue-number>
```

Renames the worktree branch to match the issue, reads the issue details, initializes the workflow state machine, and begins the IMPLEMENTING state.

## Planning marker

Planning topics use one small marker file at `docs/project/planning/<slug>.yml`.

The workflow selects the active planning marker from `docs/project/planning/*.yml`.

If there is exactly one active marker, the planning commands use it.

If there is no active marker, the planning commands stop.

If there is more than one active marker, the planning commands stop and report all of them.

The marker stores only:

- `planningId`
- `stage`
- `githubMilestone`
- `githubIssuesCreated`
- `githubIssueNumbers`

Artifact paths are derived from `planningId`.

## Planning stages

1. PRD drafting
2. PRD approval
3. architecture drafting
4. architecture approval
5. task creation on GitHub
6. planning complete

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
