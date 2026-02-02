# Pre-Merge Reflection: issue-249-fix-post-merge-reflection-gene

## Summary

Moved reflection generation from post-merge to pre-merge, added merge-and-cleanup command, and fixed multiple process issues (depcruise in worktrees, generate-docs.d.ts pollution, CI error reporting). Required 3 rounds of CodeRabbit feedback plus 2 process fixes discovered during the pipeline.

## Pipeline Timeline

**Overall duration:** ~15h (00:25 → 15:22, with overnight gap)

| # | Step | Start Time | Duration | Outcome |
|---|------|------------|----------|---------|
| 1 | Initial implementation | 00:25 | ~7m | Complete (cc8d82b) |
| 2 | Local code review (round 1) | 00:32 | — | 3 findings (AP-006 ×2, CR-004) |
| 3 | Address code review findings | 00:32 | ~32m | Extracted pure functions, shared fixture (e32f503) |
| 4 | PR submission (round 1) | ~01:00 | ~5m | Created PR #250 |
| 5 | CI checks (round 1) | ~01:05 | — | knip FAIL (new entry points not registered) |
| 6 | CodeRabbit review (round 1) | ~01:05 | — | 6 comments |
| 7 | Address feedback (round 1) | 01:04 | ~32m | Edge cases, JSON safety, knip fix (7bff77a) |
| 8 | CI checks (round 2) | ~01:10 | — | knip FAIL (unused schema export) |
| 9 | CodeRabbit review (round 2) | ~01:10 | — | 3 new comments (z.looseObject, sync fn, wording) |
| — | Overnight gap | 01:10 | ~13h40m | — |
| 10 | Address feedback (round 2) | 14:51 | ~17m | z.looseObject, sync fn, wording fixes (4c27ba6) |
| 11 | Fix process: CI error reporting | 15:08 | ~14m | gh-cli.ts now surfaces stdout/stderr (263aab4) |
| 12 | Fix process: failure recovery docs | 15:22 | — | Flowchart added to task-workflow.md (7971cc4) |
| 13 | Resolve CodeRabbit threads | 15:22 | ~5m | All 10 threads resolved |
| 14 | CodeRabbit re-review | ~15:18 | — | APPROVED |

### Pipeline Inefficiency Diagnosis

1. **CI error reporting was broken** — `complete-task` reported "Command failed" without saying which check failed or why. Required manual GitHub UI inspection. Fixed in commit 263aab4.
2. **No failure recovery flowchart** — After `complete-task` failed, no deterministic process existed for what to do next. Led to blind retries and guessing. Fixed in commit 7971cc4.
3. **knip failed twice** — First for missing entry points (should have been caught by local review), second for unused schema export (legitimate Zod pattern but needed runtime usage).
4. **3 rounds of CodeRabbit feedback** — Edge case tests, schema safety, and wording fixes. The edge case tests (round 1) and schema stripping (round 2) should have been caught locally.

## All Feedback

### Local Reviews

#### code-review-1.md (round 1)
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | AP-006: worktree-operations.ts v8 ignore covers testable logic | ✅ | - |
| 2 | AP-006: merge-and-cleanup.ts sanitizeBranchNameForPath untested | ✅ | - |
| 3 | CR-004: buildContext duplicated across 3 spec files | ✅ | - |

#### code-review-2.md (round 2)
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| — | No findings | — | — |

#### bug-scanner-1.md
Empty (no findings).

#### bug-scanner-2.md
| Result | Notes |
|--------|-------|
| PASS | 0 findings across all 25 rules |

#### task-check-1.md
| Result | Notes |
|--------|-------|
| PASS | All 5 acceptance criteria verified |

---

### GitHub Reviews

#### CodeRabbit (round 1 — 6 comments)
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | Rename template header "Post-Merge" → "Pre-Merge" | ✅ | - |
| 2 | Add string edge cases for sanitizeBranchNameForPath | ✅ | - |
| 3 | Add date edge cases for buildReflectionFilePath | ✅ | - |
| 4 | Add numeric edge cases for prNumber | ✅ | - |
| 5 | Add string edge cases for reflectionFilePath | ✅ | - |
| 6 | Wrap JSON.parse in try-catch in worktree-operations | ✅ | - |

#### CodeRabbit (round 2 — 3 comments)
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 7 | Fix field name (mergeable → mergeableState) and wording | ✅ | - |
| 8 | Schema strips unknown properties — use passthrough | ✅ | Used z.looseObject (Zod 4 equivalent) |
| 9 | Remove unnecessary async from removeWorktreePermission | ✅ | - |

#### CodeRabbit (round 3 — 1 comment)
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 10 | Spelling inconsistency (analyze vs analyses) | ❌ | "analyses" is the noun form, "analyze" is the verb — both are correct American English in their respective contexts |

---

## 5 Whys Analysis (Accepted GitHub Feedback Only)

### Failure 1: Missing edge case tests (items 2-5)

| Question | Answer |
|----------|--------|
| **1. Why wasn't this caught locally?** | Local code review (code-review-1) didn't flag missing edge cases |
| **2. Which local reviewer should have caught it?** | code-review |
| **3. Why didn't that reviewer catch it?** | CR-008 (Edge Case Checklist Enforcement) passed — the reviewer considered the existing cases sufficient |
| **4. What is the root cause of the gap?** | The code review agent doesn't systematically apply the TS-008 string/number/date checklist to every function input |
| **5. What improvement prevents this next time?** | Code review agent should cross-reference TS-008 checklist categories against each function's parameter types |

**Root Cause:** Code review agent doesn't systematically apply TS-008 edge case checklists per input type.
**Recommended Fix:** Update code review rules to require TS-008 checklist verification for each function parameter type.

### Failure 2: Schema strips unknown properties (item 8)

| Question | Answer |
|----------|--------|
| **1. Why wasn't this caught locally?** | Bug scanner didn't flag Zod's default stripping behavior |
| **2. Which local reviewer should have caught it?** | bug-scanner |
| **3. Why didn't that reviewer catch it?** | No rule exists for "Zod schema used in read-modify-write loses unknown properties" |
| **4. What is the root cause of the gap?** | This is a Zod 4 behavioral change (z.object strips by default) that isn't covered by existing rules |
| **5. What improvement prevents this next time?** | Add bug scanner rule: when Zod schema is used to parse data that will be written back, verify unknown properties are preserved (z.looseObject or .passthrough) |

**Root Cause:** No bug scanner rule for Zod read-modify-write data loss.
**Recommended Fix:** Add RFC for bug scanner: "When a Zod schema parses data that is subsequently written back to a file or API, verify the schema preserves unknown properties."

### Failure 3: Unnecessary async (item 9)

| Question | Answer |
|----------|--------|
| **1. Why wasn't this caught locally?** | Code review didn't flag sync-only async functions |
| **2. Which local reviewer should have caught it?** | code-review |
| **3. Why didn't that reviewer catch it?** | No rule for detecting async functions that only use synchronous operations |
| **4. What is the root cause of the gap?** | This is a code quality issue not covered by existing review rules |
| **5. What improvement prevents this next time?** | Low priority — TypeScript lint rules (e.g. @typescript-eslint/require-await) can catch this automatically |

**Root Cause:** No lint rule or code review check for sync-only async functions.
**Recommended Fix:** Consider enabling @typescript-eslint/require-await lint rule (low priority, trivial impact).

---

## Recommended Follow-Ups

- Add RFC to code review rules: systematic TS-008 checklist verification per function parameter type (from Failure 1)
- Add RFC to bug scanner rules: Zod read-modify-write must preserve unknown properties (from Failure 2)
- Investigate enabling @typescript-eslint/require-await lint rule (from Failure 3, low priority)
