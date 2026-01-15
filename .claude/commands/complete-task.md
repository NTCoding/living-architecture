# Complete Task

## Workflow

```text
/complete-task
    │
    ▼
Main agent runs pipeline directly
    │
    ├── Verify gate → FAIL → return to main
    │
    ▼
Create reviews/<branch>/ folder
Determine which agents to run (check skips)
    │
    ▼
Run agents IN PARALLEL (single message with multiple Task calls):
    ├─ code-review  → writes reviews/<branch>/code-review.md  → returns PASS|FAIL
    ├─ bug-scanner  → writes reviews/<branch>/bug-scanner.md  → returns PASS|FAIL
    └─ task-check   → writes reviews/<branch>/task-check.md   → returns PASS|FAIL
    │              (only if marker doesn't exist AND has issue number)
    ▼
Evaluate results:
    - If task-check PASS → create marker immediately
    - ALL PASS → continue to submit-pr
    - ANY FAIL → read failed files, fix or report
    │
    ▼
    ├── submit-pr subagent → captures output
    ├── Address ALL CodeRabbit feedback
    └── Return SUCCESS with PR ready to merge
```

## Usage

```bash
/complete-task                    # Full pipeline
/complete-task --feedback-rejected # Skip code review
```

## Instructions

Run this pipeline directly (do NOT spawn a subagent to orchestrate - subagents cannot spawn other subagents).

### 1. Verify Gate

Run `pnpm nx run-many -t lint,typecheck,test` (use 5 minute timeout)

- FAIL → return:
  ```text
  VERIFY GATE FAILED
  <raw-output>
  [paste the COMPLETE error output here - do not summarize]
  </raw-output>
  NEXT STEPS: Fix the errors and re-run /complete-task
  LOOP CONTROL: If this is your third successive attempt, ask the user for help.
  ```

### 2. Setup and Determine Agents to Run

```bash
BRANCH=$(./scripts/setup-review-dir.sh)
```

**Determine which agents to run:**

| Agent | Skip Condition |
|-------|----------------|
| code-review | `--feedback-rejected` flag passed |
| bug-scanner | Never skipped |
| task-check | Marker exists: `reviews/<branch>/task-check.marker` OR no issue number in branch |

**Issue number extraction:**
```bash
ISSUE_NUM=$(./scripts/get-issue-number.sh)
```
Search anywhere in the branch name for `issue-<digits>` pattern (case-sensitive). Use the first match if multiple exist. If `ISSUE_NUM` is empty → skip task-check.

### 3. Parallel Review Agents

Launch all applicable agents IN PARALLEL using a single message with multiple Task tool calls.

**For each agent, include in the prompt:**
- The output file path: `reviews/<branch>/<agent-name>.md`
- Instructions to write the full report to that file
- Instructions to return ONLY "PASS" or "FAIL"

**Agent prompts:**

**code-review** (if not skipped):
```text
Review changed files.
Write your complete report to: reviews/<branch>/code-review.md
Return only CODE REVIEW: PASS or CODE REVIEW: FAIL
```

**bug-scanner**:
```text
Scan changed files for bugs, dangerous config changes, security issues, and framework misuse.
Write your complete report to: reviews/<branch>/bug-scanner.md
Return only BUG SCANNER: PASS or BUG SCANNER: FAIL
```

**task-check** (if not skipped):
```text
Task ID: <issue-number>
Task location: Inline (see task definition below)

Task definition (fetched from gh issue view <issue-number>):
<task-details>
{
  "title": "<title from gh output>",
  "body": "<body from gh output>"
}
</task-details>

Work summary: Modified files: <list of changed files>

Write your complete report to: reviews/<branch>/task-check.md
Return only TASK CHECK: PASS or TASK CHECK: FAIL
```

### 4. Evaluate Results

Collect the PASS/FAIL results from each agent that ran.

**First: Handle task-check marker:**

| Scenario | Action |
|----------|--------|
| task-check ran and returned PASS | Create marker: `date > reviews/<branch>/task-check.marker` |
| task-check skipped (marker already exists) | Do not create/recreate marker |
| task-check skipped (no issue number) | Do not create marker |

The marker ensures task-check won't re-run on subsequent attempts even if other agents failed.

**Then evaluate overall results:**

**ALL PASS → Continue to step 5**

**ANY FAIL:**
1. Read the report file(s) for failed agents
2. Apply the Fix or Report decision framework (below)
3. If fixable: fix the issues and re-run `/complete-task`
4. If not fixable: return findings to user

**On failure, return:**
```text
REVIEW FAILED

Failed checks: [list which failed]

## [Agent Name] Findings
[Read and include the COMPLETE contents of reviews/<branch>/<agent>.md]

---
NEXT STEPS: [based on fix/report decision]
LOOP CONTROL: If this is your third successive attempt, ask the user for help.
```

### 5. Submit PR

Run directly (10-minute timeout):

```bash
./scripts/submit-pr.sh --title "<type>(scope): description" --body "<summary>"
```

Title: Use conventional commit format based on the changes.
Body: Brief summary of what changed and why.

### 6. Resolve CodeRabbit Feedback

Principles: CHANGES_REQUESTED means not mergeable; nitpicks contain valuable information; every unresolved item must be addressed.

- Run `./scripts/get-pr-feedback.sh` to get unresolved feedback
- If "✓ No unresolved feedback" → skip to SUCCESS
- For EACH unresolved item (CRITICAL, MAJOR, SUGGESTION, or NITPICK):
  - Either: Apply the fix (use the AI Prompt provided)
  - Or: Reply to the thread on GitHub explaining why not fixing
- After addressing all items: commit, push, run `./scripts/submit-pr.sh --update`
- Run `./scripts/get-pr-feedback.sh` again to verify no unresolved items remain
- Repeat until "✓ No unresolved feedback"

### 7. Success

Return structured message:

```text
PR READY FOR REVIEW

## Pipeline Status
- Verify gate: PASS
- Code review: PASS [or SKIPPED]
- Bug scanner: PASS
- Task check: PASS [or SKIPPED]
- CI checks: PASS
- CodeRabbit: APPROVED [or COMMENTED - no blocking issues]

## Review Reports
See reviews/<branch>/ for full reports.

## CodeRabbit Feedback Addressed
[For each comment/nitpick: file:line - summary - FIXED or NOT FIXING: reason]
OR "None"

## PR
<url> (ready to merge)
```

---

## Fix or Report Decision Framework

When a review agent returns FAIL, decide whether to fix automatically or report to the user.

### Fix Automatically When

- **Clear and unambiguous** - The issue and fix are obvious
- **Low risk** - Fix won't change behavior or break anything
- **Mechanical** - Typos, formatting, simple refactors
- **First or second attempt** - Not stuck in a loop

Examples:
- Missing error handling → add try/catch
- Unused import → remove it
- Type assertion without validation → add validation
- Deprecated API → use modern equivalent

### Report to User When

- **Ambiguous** - Multiple valid approaches, unclear which is best
- **High risk** - Could change behavior or break functionality
- **Judgment required** - Trade-offs that need human decision
- **Third attempt** - Loop control triggered
- **Conflicts** - Fix would violate other requirements or conventions

Examples:
- Architecture decisions
- Performance vs readability trade-offs
- Changing public API
- Removing functionality
- Config file changes (even if justified)

### Default Behavior

**Fix by default.** Only report to user when one of the "Report" conditions applies.

---

## Debugging SonarCloud Failures

When SonarCloud fails with coverage issues:

1. **Get the exact failure details** - Do NOT guess. Query the SonarCloud API:
   ```bash
   # Get PR number: gh pr view --json number -q .number
   curl -s "https://sonarcloud.io/api/measures/component_tree?component=NTCoding_living-architecture&pullRequest=<PR_NUMBER>&metricKeys=new_coverage&strategy=leaves&ps=100" | jq '.components[] | select(.measures[0].value == "0.0" or .measures[0].value == null) | {path: .path, coverage: .measures[0].value}'
   ```

2. **Identify the root cause** based on actual data:
   - Files with `null` coverage = lcov.info paths not matching source files
   - Files with `0.0` coverage = tests not covering the code
   - Type-only files (interfaces, types) = exclude from coverage in sonar-project.properties
