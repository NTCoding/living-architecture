# Post-Merge Completion

Run after a PR is merged to reflect on the task and clean up the worktree.

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
Gather feedback:
    ├─ Local reviews (reviews/<branch>/*.md)
    ├─ PR feedback (./scripts/get-pr-feedback.sh)
    ├─ Git history (git log --oneline main..<branch>)
    └─ Conversation history
    │
    ▼
Analyze failures (5 whys for external review issues)
    │
    ▼
Present reflection to user with options:
    1. Create process fix issues → create GitHub issues
    2. Skip → proceed to cleanup
    │
    ▼
Handle user choice:
    ├─ Create issues → ./scripts/create-non-milestone-task.sh
    └─ Skip → continue
    │
    ▼
Cleanup worktree (./scripts/cleanup-task.sh)
    │
    ▼
Ask user: Start process fix task now?
    ├─ Yes → ./scripts/start-task.sh <issue-number>
    └─ No → Ready for next task
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

This returns JSON with a `state` field: `merged`, `open`, `closed`, or `not_found`.

If state is not `merged`, stop and inform the user:
```text
PR is not merged yet. Current state: <state>
Run /post-merge-completion after the PR is merged.
```

### 2. Analyze Failures

Analyze the completed task. Focus on what failed, not what could be improved.

#### Gather Feedback

```bash
BRANCH=$(git branch --show-current)
```

**Local review reports** (in `reviews/<branch>/`):
- `code-review.md` - Convention violations, architecture issues
- `bug-scanner.md` - Bugs, security issues, framework misuse
- `task-check.md` - Task completion verification
- `doc-suggestions.md` - Documentation drift and missing docs (informational)

**PR feedback** (from GitHub):
```bash
./scripts/get-pr-feedback.sh
```
This includes CodeRabbit comments, human reviewer feedback, and CI results.

**Git history** - What was fixed between iterations:
```bash
git log --oneline main..<branch>
```

**Conversation history** - Issues that came up during development, things that took multiple attempts.

#### Identify Process Failures

Analyze feedback with failure-first framing. Ask: "What failed?" not "What could be improved?"

**Types of failures:**

- **Detection failures** - Issues that should have been caught locally but weren't
- **Knowledge failures** - Principles violated because they weren't known or remembered
- **Process failures** - Missing checks, unclear workflows, gaps in tooling

#### External Review = Process Failure

**Definition:** Any issue caught by an external reviewer (CodeRabbit, human) is a **process failure by definition**. This is not an "improvement opportunity" - it's a failure to catch the issue locally.

**Why this matters:**
- External reviewers are the last line of defense before shipping
- If they catch something, our local checks failed
- Framing as "improvement" minimizes the failure and reduces learning

**Mandatory response:** Every external review finding requires:
1. 5 Whys analysis (see section below)
2. Self-reflection: "Why did I write code that violated best practices I know?"
3. Process fix to prevent recurrence

When PR feedback reveals a generalizable pattern:
1. Add a new check to `docs/conventions/review-feedback-checks.md`
2. Follow the RFC format (Source, Pattern, Bad/Good examples, Detection)
3. Bug-scanner will apply the check to future PRs

This creates a feedback loop: PR feedback → failure analysis → process fix → catch locally next time.

#### 5 Whys Analysis

For each issue caught by external review, perform 5 Whys analysis:

```markdown
#### Failure: [Issue Title]

1. **Why did external review catch this?**
   [What the reviewer found]

2. **Why didn't local checks catch it?**
   [Missing lint rule, test, code review check, etc.]

3. **Why was the code written this way?**
   [What led to the problematic implementation]

4. **Why didn't I apply the correct approach?**
   [Knowledge gap, application gap, or process gap]

5. **Why doesn't our process prevent this?**
   [What's missing from our workflow/tooling]

**Root Cause:** [One sentence conclusion]
**Process Fix:** [Specific change to prevent recurrence]
```

#### Analyze Failures

For each failure, answer: **Would this have shipped broken?**

| Failure | Would This Have Shipped Broken? | Self-Reflection | Process Fix |
|---------|--------------------------------|-----------------|-------------|
| [issue] | Yes/No - [why] | Why did I violate principles I know? | [fix] |

**Severity is binary:** Either the code would have shipped broken, or it wouldn't.

### 3. Present Reflection

```markdown
# Task Reflection: <branch-name>

## Summary
[1-2 sentences on how the task went]

## Feedback Addressed

### Local Reviews
| Source | Findings | Fixed | Skipped (with reason) |
|--------|----------|-------|----------------------|
| code-review.md | X | Y | Z |
| bug-scanner.md | X | Y | Z |
| task-check.md | PASS/FAIL | - | - |

### Documentation Suggestions (from doc-suggestions.md)
| Type | Description | Action |
|------|-------------|--------|
| Drift | [doc is now incorrect] | [fix now / create issue / skip] |
| Missing | [new feature undocumented] | [fix now / create issue / skip] |

### PR Feedback
| Reviewer | Comments | Resolved | How |
|----------|----------|----------|-----|
| CodeRabbit | X | Y | [brief description] |
| [Human] | X | Y | [brief description] |

### Iterations
[How many /complete-task runs? What failed and was fixed?]

## Failure Analysis

### External Review Failures
Any issue caught by external reviewers is a process failure.

| Failure | Would This Have Shipped Broken? | Self-Reflection | Process Fix |
|---------|--------------------------------|-----------------|-------------|
| [issue] | Yes/No - [why] | Why did I violate principles I know? | [fix] |

### 5 Whys Analysis
[Required for each external review failure]

#### Failure: [title]
1. **Why did external review catch this?** [answer]
2. **Why didn't local checks catch it?** [answer]
3. **Why was the code written this way?** [answer]
4. **Why didn't I apply the correct approach?** [answer]
5. **Why doesn't our process prevent this?** [answer]

**Root Cause:** [one sentence]
**Process Fix:** [specific change]

### Process Friction
[Steps that were confusing, commands that failed, missing docs]

## Action Items
Would you like me to:
1. Create GitHub issues for process fixes (then implement via normal workflow)
2. Skip and proceed to cleanup
```

### 4. Handle User Choice

**If implementing process fixes:**
- Create GitHub issues using `./scripts/create-non-milestone-task.sh --type tech`
- Proceed to cleanup

**If skipping:**
- Proceed to cleanup

### 5. Cleanup

Run the cleanup script:

```bash
./scripts/cleanup-task.sh
```

### 6. Complete

```markdown
# Post-Merge Complete

## Reflection
[Summary of failures analyzed]

## Process Fixes
- Issues created: [list with issue numbers, or "None"]

## Cleanup
Worktree removed: <path>

---
Would you like to start working on one of the process fix tasks now?
- Yes → I'll run `./scripts/start-task.sh <issue-number>`
- No → Ready for next task. Run `./scripts/list-tasks.sh` to see available work.
```

If user chooses yes, run `./scripts/start-task.sh <issue-number>` to begin the process fix task via normal workflow.
