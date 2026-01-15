# Next Task

Find the next available task, considering parallel work streams.

## Workflow

1. Run `./scripts/list-tasks.sh` to get tasks from all active PRD milestones
2. Read active PRD(s) from `docs/project/PRD/active/`
3. Parse each PRD's Parallelization section (Section 10) to identify tracks
4. Map tasks to tracks via deliverable refs in task body
5. Identify busy tracks (tasks with assignees)
6. Recommend task from idle track
7. Present recommendation with alternatives

## Track Mapping

Look for deliverable references in task body:

- `PRD Section: M2.3` or `Traceability: M2-D3` - Milestone and deliverable reference
- `Deliverable: D3.1` - Deliverable reference
- `Research-R1` or `PRD Section: Research-R1` - Research track
- Section numbers like `3.4`, `D2.5` - Match to PRD deliverable numbering

Match these to track definitions in the PRD Parallelization section. Tracks are labeled A, B, C, D (or similar) with deliverables listed.

Example PRD Parallelization section:

```text
TRACK A (Extraction):     M1 --> M2 --> D3.3 --> M5
TRACK B (Conventions):    D3.1 --> D3.2 --> D4.1
TRACK C (Research):       R1
```

## Output Format

Every item uses the same format - PRD tracks and non-milestone categories:

```text
Track: PRD12-A (Extraction)
Status: in progress
Issue: #165 (@NTCoding)
────────────────────────────────────────
Track: PRD12-B (Conventions)
Status: ready
Issue: #167
────────────────────────────────────────
Track: PRD12-C (Research)
Status: ready
Issue: #171
────────────────────────────────────────
Track: Tech Improvements
Status: 1 available
Issue: #174
────────────────────────────────────────
Track: Bugs
Status: none
Issue: —
────────────────────────────────────────
Track: Ideas
Status: none
Issue: —
────────────────────────────────────────

## Available tracks

- PRD12-B: #167 - Create conventions interfaces
- PRD12-C: #171 - Evaluate local LLM for metadata extraction
- Tech Improvements: #174 - Add RFC-008 to review checks

## Recommendation

PRD12-B: #167 - Create conventions interfaces (earliest PRD track)
```

**Status values:**
- **in progress** - Assigned task (show issue # and @assignee)
- **blocked by X** - Next task depends on another track
- **ready** - Unassigned tasks available
- **idle** - No open tasks for this track
- **X available** - For non-milestone categories
- **none** - No tasks in this category

## Edge Cases

- **PRD without Parallelization section**: List unassigned tasks sequentially (first available)
- **All tracks busy**: Recommend non-milestone task (bugs/tech/ideas) first
- **No tasks available**: Report "No unassigned tasks available"
- **Task doesn't map to any track**: Include in "Unmapped Tasks" section
- **Multiple active PRDs**: Analyze tracks across all PRDs, prefer diversifying work
- **No active PRD directory**: If `list-tasks.sh` returns an error, report "No active PRDs found" and fall back to non-milestone tasks only

## After Confirmation

Once user confirms a task, run `./scripts/start-task.sh <issue-number>` to begin work.
