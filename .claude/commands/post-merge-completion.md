# Post-Merge Completion

Run after a PR is merged to analyze feedback, generate a reflection report, and clean up.

## Workflow

```text
/post-merge-completion
    │
    ▼
Verify PR is merged
    │
    ├── NOT MERGED → stop, inform user
    │
    ▼
Gather all feedback (local + GitHub)
    │
    ▼
Generate reflection markdown file: reviews/<branch>/post-merge-reflection.md
    │
    ▼
Tell user to review the file, then discuss follow-ups
    │
    ▼
After discussion: create issues, update RFCs, cleanup
```

## Usage

```bash
/post-merge-completion
```

## Instructions

### 1. Verify PR is Merged

```bash
pnpm nx run dev-workflow:get-pr-feedback
```

Returns JSON with `state` field: `merged`, `open`, `closed`, or `not_found`.

If not `merged`, stop:
```text
PR is not merged yet. Current state: <state>
Run /post-merge-completion after the PR is merged.
```

### 2. Gather All Feedback

```bash
BRANCH=$(git branch --show-current)
```

**Local feedback sources** (in `reviews/<branch>/`):
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

Create `reviews/<branch>/post-merge-reflection.md` with the following structure.

Parse each piece of feedback into individual items. For every item, determine: accepted (code was changed) or rejected (no change, with reason).

```markdown
# Post-Merge Reflection: <branch-name>

## Summary
[1-2 sentences on how the task went]

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

### 4. Present to User for Review

After generating the file, tell the user:

```text
Reflection report generated: reviews/<branch>/post-merge-reflection.md

Please review it, then we can discuss the recommended follow-ups.
```

**Wait for user to respond.** Do not proceed until they engage.

### 5. Discuss Follow-Ups

Based on user's feedback on the reflection:
- Adjust any 5 Whys analyses the user disagrees with
- Finalize which follow-ups to act on
- For agreed follow-ups:
  - Add new RFCs to `docs/conventions/review-feedback-checks.md` if applicable
  - Create GitHub issues using `./scripts/create-non-milestone-task.sh --type tech` for process fixes

### 6. Cleanup

```bash
./scripts/cleanup-task.sh
```

### 7. Complete

```text
Post-merge complete. Worktree cleaned up.

Process fix issues created: [list with issue numbers, or "None"]

Would you like to start a process fix task now?
- Yes → ./scripts/start-task.sh <issue-number>
- No → Run /next-task for available work
```
