# choose-next-task

Find the next available task, considering delivery-plan parallel work streams.

## Workflow

1. List tasks from all planning folders with approved delivery plans, including folders whose planning marker is already `planning-complete`:
   - Scan `docs/project/PRD/*/marker.yml` for planning folders
   - Read `githubMilestone` from each folder's `marker.yml`
   - Read `docs/project/PRD/<planningId>/delivery.md` for each folder that has one
   - Use `docs/project/PRD/<planningId>/delivery.md` to find deliverables and YAML tracks
   - For each planning folder's GitHub milestone: `gh issue list --milestone "<githubMilestone>" --state open --json number,title,assignees,body,labels`
   - Non-milestone tasks: `gh issue list --search 'label:"idea" no:milestone state:open' --json number,title,assignees,body,labels` (repeat for `label:"bug"` and `label:"tech improvement"`)
   - Merge non-milestone task results and deduplicate by issue `number` before counting or recommending tasks
2. Read approved delivery plan(s) from `docs/project/PRD/<planningId>/delivery.md`
3. Parse each delivery plan's Parallelisation section to identify tracks (requires YAML track definitions)
4. Map tasks to tracks via deliverable refs in task body
5. Identify busy tracks (tasks with assignees)
6. Recommend task from a ready track
7. Present recommendation with alternatives

## Track Mapping

Look for deliverable references in task body:

- `Delivery plan: ... M2 (D2.1)` - milestone and deliverable reference
- `Deliverable: D3.1` - deliverable reference
- `Traceability: M2-D3` - milestone and deliverable reference
- Section numbers like `D2.5` - match to delivery-plan deliverable numbering

Match these to track definitions in the delivery plan Parallelisation section. Tracks must be defined in YAML format:

```yaml
tracks:
  - name: Extraction
    deliverables:
      - D1.1
      - D1.2
    can_run_in_parallel_with:
      - Conventions
    coordination_risk: none
  - name: Conventions
    deliverables:
      - D2.1
    can_run_in_parallel_with:
      - Extraction
    coordination_risk: shared configuration decisions
```

## Output Format

Every item uses the same format - delivery tracks and non-milestone categories:

```text
Track: riviere-extraction-workflows-v1 — Extraction
Status: in progress
Issue: #165 (@NTCoding)
────────────────────────────────────────
Track: riviere-extraction-workflows-v1 — Conventions
Status: ready
Issue: #167
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

- riviere-extraction-workflows-v1 — Conventions: #167 - Create conventions interfaces
- Tech Improvements: #174 - Add RFC-008 to review checks

## Recommendation

riviere-extraction-workflows-v1 — Conventions: #167 - Create conventions interfaces (ready delivery track)
```

**Status values:**

- **in progress** - Assigned task (show issue # and @assignee)
- **blocked by X** - Next task depends on another track
- **ready** - Unassigned tasks available
- **idle** - No open tasks for this track
- **X available** - For non-milestone categories
- **none** - No tasks in this category

## Edge Cases

- **Planning folder without approved delivery plan**: skip it for delivery-track recommendations
- **Delivery plan without YAML track definitions**: report that `delivery.md` needs a Parallelisation section before track-aware recommendations are possible
- **All tracks busy**: recommend non-milestone task (bugs/tech/ideas) first
- **No tasks available**: report "No unassigned tasks available"
- **Multiple planning folders with approved delivery plans**: analyze tracks across all approved delivery plans, prefer earlier planning folder unless user asks otherwise
- **No planning folder with an approved delivery plan**: report "No approved delivery plans found" and fall back to non-milestone tasks only

## After Confirmation

Once user confirms a task:

1. Assign the issue: `gh issue edit <issue-number> --add-assignee @me`
2. Tell the user:

---

Run `/dev-workflow-v2:start-implementation <issue-number>` to begin.

---
