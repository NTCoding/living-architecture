# Pre-Merge Reflection

Generate a reflection report analyzing all feedback received during the PR lifecycle. Run this **before** merging.

## Workflow

```text
/pre-merge-reflection
    │
    ▼
Verify PR is mergeable
    │
    ├── NOT MERGEABLE → stop, inform user
    │
    ▼
Gather all feedback (local + GitHub)
    │
    ▼
Generate reflection markdown file: docs/continuous-improvement/post-merge-reflections/{date}-{branch-name}.md
    │
    ▼
Commit the reflection file
    │
    ▼
Present to user for review and discussion
    │
    ▼
After discussion: adjust file, re-commit, create follow-up issues
    │
    ▼
Tell user: "Run pnpm nx run dev-workflow:merge-and-cleanup"
```

## Instructions

### 1. Verify PR is Mergeable

```bash
pnpm nx run dev-workflow:get-pr-feedback
```

Confirm `state` is `open` and `mergeableState` is `clean`. If not, stop:
```text
PR is not ready to merge. Current state: <state>, mergeableState: <mergeableState>
Address outstanding issues before running /pre-merge-reflection.
```

### 2. Gather All Feedback

```bash
BRANCH=$(git branch --show-current)
```

**Local feedback sources** (read each file from `reviews/<branch>/`):
- `code-review.md` - Convention violations, architecture issues
- `bug-scanner.md` - Bugs, security issues, framework misuse
- `task-check.md` - Task completion verification
- `doc-suggestions.md` - Documentation drift and missing docs

**GitHub feedback:**
```bash
pnpm nx run dev-workflow:get-pr-feedback -- --include-resolved
```

Returns all CodeRabbit comments, human reviewer feedback, and resolved threads with their status.

**Git history** (iterations/fixes between reviews):
```bash
git log --oneline main..<branch>
```

### 3. Generate Reflection Markdown

Create `docs/continuous-improvement/post-merge-reflections/<YYYY-MM-DD>-<branch-name>.md` (create the directory if it doesn't exist).

Parse each piece of feedback into individual items. For every item, determine: accepted (code was changed) or rejected (no change, with reason).

```markdown
# Pre-Merge Reflection: <branch-name>

## Summary
[1-2 sentences on how the task went]

## Pipeline Timeline

**Overall duration:** [total time from first commit to running /pre-merge-reflection]

| # | Step | Start Time | Duration | Outcome |
|---|------|------------|----------|---------|
| 1 | Initial implementation | HH:MM | Xm | Complete |
| 2 | Local code review | HH:MM | Xm | N findings |
| 3 | Bug scanner | HH:MM | Xm | PASS/FAIL |
| 4 | Task check | HH:MM | Xm | PASS/FAIL |
| 5 | PR submission | HH:MM | Xm | Created |
| 6 | CI checks | HH:MM | Xm | Pass/Fail |
| 7 | CodeRabbit review | HH:MM | Xm | N comments |
| 8 | Address feedback | HH:MM | Xm | N resolved |
| ... | [additional iterations] | ... | ... | ... |

Populate from `git log` timestamps and PR event history.

### Pipeline Inefficiency Diagnosis

Analyze the timeline above for:
- Long waits between steps (idle time)
- Repeated failures requiring multiple iterations
- Unnecessary retries or rework
- Steps that could have been parallelized

[Describe any inefficiencies found and how to avoid them next time]

## All Feedback

### Local Reviews

#### code-review.md
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | [specific feedback item] | ✅ | - |
| 2 | [specific feedback item] | ❌ | [why it was rejected] |

#### bug-scanner.md
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | [specific feedback item] | ✅ | - |

#### task-check.md
| Result | Notes |
|--------|-------|
| PASS/FAIL | [any relevant details] |

#### doc-suggestions.md
| # | Suggestion | Accepted? | Rejected Reason |
|---|------------|-----------|-----------------|
| 1 | [specific suggestion] | ✅ | - |

---

### GitHub Reviews

#### CodeRabbit
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | [specific feedback item] | ✅ | - |
| 2 | [specific feedback item] | ❌ | [why] |

#### [Human Reviewer Name]
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | [specific feedback item] | ✅ | - |

---

## 5 Whys Analysis (Accepted GitHub Feedback Only)

Any feedback accepted from GitHub reviewers represents a process failure — it should have been caught locally.

### Failure 1: [Brief description of the accepted feedback]

| Question | Answer |
|----------|--------|
| **1. Why wasn't this caught locally?** | [What local check missed it] |
| **2. Which local reviewer should have caught it?** | code-review / bug-scanner / task-check / doc-suggestions |
| **3. Why didn't that reviewer catch it?** | [Gap in the reviewer's rules/checks] |
| **4. What is the root cause of the gap?** | [Why the rule/check doesn't exist or failed] |
| **5. What improvement prevents this next time?** | [Specific change to local reviewer, convention, or process] |

**Root Cause:** [One sentence]
**Recommended Fix:** [Specific actionable change]

### Failure 2: [next accepted GitHub feedback item]
[Same table structure]

---

## Recommended Follow-Ups
[Bulleted list of proposed actions derived from the 5 Whys analyses above]
```

### 4. Commit the Reflection File

Stage, commit, and push the reflection file:
```bash
git add docs/continuous-improvement/post-merge-reflections/<YYYY-MM-DD>-<branch-name>.md
git commit -m "docs: add pre-merge reflection for <branch>"
pnpm nx run dev-workflow:push-reflection
```

### 5. Present to User for Review

After generating and committing the file, tell the user:

```text
Reflection report generated and committed: docs/continuous-improvement/post-merge-reflections/<YYYY-MM-DD>-<branch-name>.md

Please review it, then we can discuss the recommended follow-ups.
```

**Wait for user to respond.** Do not proceed until they engage.

### 6. Discuss Follow-Ups

Based on user's feedback on the reflection:
- Adjust any 5 Whys analyses the user disagrees with
- Finalize which follow-ups to act on
- For agreed follow-ups:
  - Add new RFCs to `docs/conventions/review-feedback-checks.md` if applicable
  - Create GitHub issues using `./scripts/create-non-milestone-task.sh --type tech` for process fixes
- If changes were made, amend the commit or create a new commit

### 7. Complete

```text
Reflection complete. To merge and clean up, run:

pnpm nx run dev-workflow:merge-and-cleanup
```
