# Parallel Workflow

> **Principle:** Fully embrace parallel development. Design for parallelism, not detection after the fact.

This workflow enables multiple Claude agents to work simultaneously on feature development. Scalable to 10+ parallel agents.

---

## Core Concepts

### Parallel Tracks

A **track** is an independent stream of work that can proceed without blocking other tracks. Tracks are derived from package boundaries.

```text
Track: riviere-query     → Agent 1
Track: riviere-cli       → Agent 2
Track: eclair            → Agent 3
Track: riviere-builder   → Agent 4
```

Tasks touching the same package are on the same track (sequential within track). Tasks touching different packages are on different tracks (parallel).

### Parallelism Threshold

The **parallelism threshold** is the target number of concurrent agents. Default: 4.

If active work provides fewer tracks than the threshold, activate additional PRDs.

### Ready Queue

The **ready queue** contains tasks that:
1. Have all dependencies satisfied (blocked-by tasks closed)
2. Are not assigned to an agent
3. Have no file conflicts with in-progress work

Agents pull from the ready queue across all active PRDs.

### Active PRD Pool

Multiple PRDs can be active simultaneously. The pool expands when parallelism is insufficient, contracts as PRDs complete.

---

## Process Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           ACTIVATION PHASE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐       │
│  │  SELECT  │────▶│ ACTIVATE │────▶│  CREATE  │────▶│ ANALYZE  │       │
│  │   PRD    │     │   PRD    │     │  TASKS   │     │PARALLELISM       │
│  └──────────┘     └──────────┘     └──────────┘     └──────────┘       │
│       │                                                   │             │
│       │                                                   ▼             │
│       │                                          ┌───────────────┐      │
│       │                                          │  Sufficient?  │      │
│       │                                          └───────────────┘      │
│       │                                            │           │        │
│       │◀───────────── No ──────────────────────────┘           │        │
│                      (activate another PRD)                Yes │        │
│                                                                ▼        │
└────────────────────────────────────────────────────────────────┼────────┘
                                                                 │
                                                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           EXECUTION PHASE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐       │
│  │  LIST    │────▶│  ASSIGN  │────▶│ IMPLEMENT│────▶│ COMPLETE │       │
│  │  READY   │     │   TASK   │     │          │     │   TASK   │       │
│  └──────────┘     └──────────┘     └──────────┘     └──────────┘       │
│       ▲                                                   │             │
│       │                                                   │             │
│       └───────────────────────────────────────────────────┘             │
│                        (next ready task)                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                                                 │
                                                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          COMPLETION PHASE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  When all tasks in a PRD complete:                                      │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                        │
│  │ ARCHIVE  │────▶│ RECHECK  │────▶│  REMOVE  │                        │
│  │   PRD    │     │PARALLELISM     │ FROM POOL│                        │
│  └──────────┘     └──────────┘     └──────────┘                        │
│                         │                                               │
│                         ▼                                               │
│                 If below threshold → activate another PRD               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## GitHub Issue Structure

### Task Metadata Block

Every task issue must include a metadata block:

```markdown
## Parallel Metadata

- **Packages:** `riviere-query`, `riviere-cli`
- **Blocked by:** #120, #121
- **Touches:** `packages/riviere-query/src/query/**`, `packages/riviere-cli/src/commands/analyze.ts`
```

| Field | Required | Description |
|-------|----------|-------------|
| **Packages** | Yes | Which packages this task modifies. Determines track assignment. |
| **Blocked by** | Yes | Issue numbers that must close before this task can start. Empty if none. |
| **Touches** | No | Specific files/directories (glob patterns). For conflict detection. |

### Parallel Group Labels

During task creation, tasks are labeled with their parallel group:

- `parallel-group-1` - Can start immediately (no dependencies)
- `parallel-group-2` - Starts after group 1
- `parallel-group-N` - Starts after group N-1

---

## Commands Reference

### Activation Phase

| Command | Purpose |
|---------|---------|
| `./scripts/list-prds.sh` | Show PRDs by status (not-started, active, archived) |
| `./scripts/activate-prd.sh <name>` | Move PRD to active, create milestone |
| `/create-tasks` | Create tasks from active PRD with parallel analysis |
| `./scripts/analyze-parallelism.sh` | Check if current active PRDs meet parallelism threshold |

### Execution Phase

| Command | Purpose |
|---------|---------|
| `./scripts/list-ready-tasks.sh` | Show ready tasks across all active PRDs |
| `./scripts/start-task.sh <issue>` | Assign task, create worktree, begin work |
| `/complete-task` | Verify, review, create PR |

### Completion Phase

| Command | Purpose |
|---------|---------|
| `./scripts/archive-prd.sh <name>` | Archive completed PRD, close milestone |
| `/post-merge-completion` | Reflect on feedback, cleanup |

---

## Scripts Specification

### `list-ready-tasks.sh`

Shows tasks ready for parallel execution across all active PRDs.

**Output:**

```text
Ready Tasks (4 available, 3 in progress)

READY:
  #125  [riviere-query]  Add validation to schema parser
  #127  [eclair]         Implement flow diagram zoom
  #130  [riviere-cli]    Add --format flag to analyze command
  #132  [riviere-query]  ⚠️  CONFLICT with #125 (same files)

IN PROGRESS:
  #124  [riviere-builder]  @agent-1  PR #89 open
  #126  [eclair]           @agent-2  implementing
  #129  [riviere-cli]      @agent-3  implementing

BLOCKED:
  #128  [riviere-query]  blocked by #125
  #131  [eclair]         blocked by #127
```

**Logic:**
1. Query all open issues across active PRD milestones
2. Parse `Blocked by` field, filter to issues with all blockers closed
3. Parse `Packages` and `Touches` fields
4. Check for file conflicts with in-progress tasks
5. Group by status: ready, in-progress, blocked

---

### `analyze-parallelism.sh`

Validates that current active PRDs provide sufficient parallel tracks.

**Arguments:**
- `--threshold N` - Target number of parallel tracks (default: 4)

**Output (sufficient):**

```text
Parallelism Analysis

Active PRDs: 2
  - PRD-007: riviere-extract (12 tasks, 3 tracks)
  - PRD-008: eclair-improvements (8 tasks, 2 tracks)

Parallel Tracks: 5
  Track                 Tasks    Ready    In Progress
  riviere-query         4        2        1
  riviere-cli           3        1        1
  riviere-builder       2        1        0
  eclair                6        3        1
  riviere-extract-ts    5        2        1

✓ SUFFICIENT: 5 tracks ≥ 4 threshold
```

**Output (insufficient):**

```text
Parallelism Analysis

Active PRDs: 1
  - PRD-007: riviere-extract (8 tasks, 2 tracks)

Parallel Tracks: 2
  Track                 Tasks    Ready    In Progress
  riviere-query         5        1        1
  riviere-cli           3        1        0

⚠️  INSUFFICIENT: 2 tracks < 4 threshold

Recommendations:
  1. Activate another PRD (see candidates below)
  2. Review if PRD-007 tasks can be split further

PRD Candidates:
  - PRD-008: eclair-improvements (estimated 3 tracks)
  - PRD-009: documentation-site (estimated 2 tracks)
```

**Logic:**
1. Query active PRD milestones
2. For each, get open issues and extract `Packages` field
3. Count unique packages = track count
4. Sum across PRDs
5. Compare to threshold
6. If insufficient, suggest candidate PRDs

---

### `start-task.sh` (modified)

Enhanced to check for conflicts before assignment.

**New behavior:**
1. Parse `Touches` field from issue
2. Get `Touches` from all in-progress issues
3. If overlap detected, warn and prompt for confirmation
4. If no conflict, proceed with assignment and worktree creation

**Conflict warning:**

```text
⚠️  POTENTIAL CONFLICT DETECTED

Task #125 touches:
  - packages/riviere-query/src/query/validator.ts

In-progress task #124 also touches:
  - packages/riviere-query/src/query/validator.ts

Proceed anyway? (y/N)
```

---

### `/create-tasks` Skill (modified)

Enhanced to output parallel analysis during task creation.

**New output section:**

```markdown
## Parallel Analysis

### Tracks Identified
| Track | Tasks | Dependencies |
|-------|-------|--------------|
| riviere-query | #125, #128 | #128 blocked by #125 |
| riviere-cli | #126, #129, #130 | #129 blocked by #126 |
| eclair | #127, #131 | #131 blocked by #127 |

### Parallel Groups
- **Group 1 (immediate):** #125, #126, #127
- **Group 2 (after group 1):** #128, #129, #130, #131

### Parallelism Score
- Tracks: 3
- Max concurrent tasks: 3 (group 1)
- Estimated waves: 2

⚠️  With 4 target agents, 1 agent will be idle during group 1.
Consider activating an additional PRD.
```

---

## Workflow Scenarios

### Scenario 1: Starting Fresh

```text
Human: Let's start the next PRD

Agent:
1. ./scripts/list-prds.sh --not-started
   → Shows PRD-007, PRD-008, PRD-009

2. Human selects PRD-007

3. ./scripts/activate-prd.sh PRD-007
   → PRD moved to active/

4. /create-tasks
   → Creates 8 tasks with parallel analysis
   → Output shows: 2 tracks, groups 1-3

5. ./scripts/analyze-parallelism.sh
   → INSUFFICIENT: 2 tracks < 4 threshold
   → Recommends: activate PRD-008

6. Human: "Activate PRD-008 as well"

7. ./scripts/activate-prd.sh PRD-008
   → /create-tasks for PRD-008
   → 6 more tasks, 2 additional tracks

8. ./scripts/analyze-parallelism.sh
   → SUFFICIENT: 4 tracks ≥ 4 threshold

9. ./scripts/list-ready-tasks.sh
   → Shows 4 ready tasks across both PRDs

10. Human assigns agents to tasks
```

### Scenario 2: Track Runs Dry

```text
Agent 2 completes task #127 (eclair track)

Agent 2:
1. ./scripts/list-ready-tasks.sh
   → #131 now ready (was blocked by #127)
   → Shows 3 ready tasks

2. ./scripts/start-task.sh 131
   → Continues on eclair track

Later, all eclair tasks complete while other tracks continue:

Agent 2:
1. ./scripts/list-ready-tasks.sh
   → No eclair tasks remain
   → riviere-query #128 is ready

2. ./scripts/start-task.sh 128
   → Agent 2 moves to riviere-query track
   → No conflict (different files from in-progress work)
```

### Scenario 3: PRD Completes

```text
All PRD-007 tasks merged

Agent:
1. ./scripts/archive-prd.sh PRD-007
   → PRD moved to archived/
   → Milestone closed

2. ./scripts/analyze-parallelism.sh
   → Now only PRD-008 active
   → INSUFFICIENT: 2 tracks < 4 threshold

3. Human: "Activate PRD-009"
   → Process continues
```

---

## Task Creation Guidelines

When creating tasks from a PRD, design for parallelism:

### 1. Identify Package Boundaries

Map deliverables to packages. Each package = potential parallel track.

```text
Deliverable: "Add schema validation"

Touches:
  - riviere-query (validation logic)
  - riviere-cli (CLI integration)
  - riviere-builder (builder integration)

→ Split into 3 tasks, one per package
→ Define interfaces first, then implement in parallel
```

### 2. Front-Load Interface Tasks

Create interface/contract tasks with no dependencies. Implementation tasks depend on interfaces.

```text
Group 1 (parallel):
  #125: Define ValidationResult type in riviere-query
  #126: Define validate command interface in riviere-cli
  #127: Define builder validation hook in riviere-builder

Group 2 (parallel, after group 1):
  #128: Implement schema validator (blocked by #125)
  #129: Implement validate command (blocked by #126)
  #130: Implement builder validation (blocked by #127)
```

### 3. Avoid Cross-Package Dependencies

Tasks should depend on tasks in the same package, not across packages.

```text
❌ Bad: #129 (riviere-cli) blocked by #128 (riviere-query)
   → Creates serial dependency across tracks

✓ Good: #129 (riviere-cli) blocked by #126 (riviere-cli)
   → Dependency within same track, other tracks unaffected
```

### 4. Size Tasks for Balance

Aim for roughly equal task counts per track. Avoid one track with 10 tasks and another with 2.

```text
⚠️  Unbalanced:
  riviere-query: 8 tasks
  riviere-cli: 2 tasks

✓ Balanced:
  riviere-query: 5 tasks
  riviere-cli: 4 tasks
  riviere-builder: 3 tasks
```

---

## Configuration

### Parallelism Threshold

Set in `.claude/parallel-config.yml`:

```yaml
parallelism:
  threshold: 4              # Target number of parallel agents
  min-track-size: 2         # Warn if any track has fewer tasks
  conflict-check: true      # Enable file conflict detection
```

### Package Definitions

Tracks are derived from the monorepo structure:

```yaml
packages:
  - name: riviere-query
    path: packages/riviere-query/**
  - name: riviere-builder
    path: packages/riviere-builder/**
  - name: riviere-cli
    path: packages/riviere-cli/**
  - name: riviere-schema
    path: packages/riviere-schema/**
  - name: riviere-extract-config
    path: packages/riviere-extract-config/**
  - name: riviere-extract-conventions
    path: packages/riviere-extract-conventions/**
  - name: riviere-extract-ts
    path: packages/riviere-extract-ts/**
  - name: eclair
    path: apps/eclair/**
  - name: docs
    path: apps/docs/**
```

---

## Migration from Sequential Workflow

### What Changes

| Aspect | Before | After |
|--------|--------|-------|
| Active PRDs | 1 at a time | Multiple (as needed for parallelism) |
| Task selection | Agent picks from list | Agent pulls from ready queue |
| Dependencies | Prose in description | Structured metadata block |
| Conflict detection | None | File-based checking |
| Task creation | Sequential thinking | Parallel-first design |

### What Stays the Same

| Aspect | No Change |
|--------|-----------|
| GitHub issues | Still the task system |
| Git worktrees | Still used for isolation |
| `/complete-task` | Still the completion flow |
| PR review | Still human-reviewed |
| Scripts location | Still `./scripts/` |

---

## Troubleshooting

### "All tasks are blocked"

Check dependency chains. Look for circular dependencies or a single bottleneck task.

```bash
./scripts/list-ready-tasks.sh --show-blockers
```

### "Insufficient parallelism but no PRDs available"

Options:
1. Create new PRD from backlog
2. Pull from bugs/tech-improvements as filler
3. Accept reduced parallelism temporarily

### "Conflict detected but tasks should be independent"

Refine the `Touches` field. Overly broad patterns cause false conflicts.

```markdown
# Too broad - conflicts with everything in package
Touches: packages/riviere-query/**

# Better - specific files
Touches: packages/riviere-query/src/validation/**
```

### "Track imbalance - one track has all the work"

Revisit task design. Split large tasks or combine small ones. Consider if work can be redistributed across packages.
