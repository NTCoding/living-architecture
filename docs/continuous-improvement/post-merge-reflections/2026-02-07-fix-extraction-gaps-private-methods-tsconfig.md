# Post-Merge Reflection: fix/extraction-gaps-private-methods-tsconfig

## Summary

PR #259 addressed code review and CI feedback from the initial PR submission. Primary changes: moved platform/infra root files into standard sub-folders (SoC-012), deleted unused shell barrel, annotated deleted files in code review prompts, removed dead re-exports flagged by knip, and fixed rename path handling in `parseDiffNameStatus`. Completed across 3 sessions due to context compaction.

## Pipeline Timeline

**Overall duration:** ~3.5 hours (13:17 → 16:49 UTC, Feb 7 2026)

| # | Step | Start Time | Duration | Outcome |
|---|------|------------|----------|---------|
| 1 | Initial implementation (tsconfig + private methods) | 13:17 | 27m | Complete (fee8093) |
| 2 | Tweaks | 13:17 | 0m | Complete (1114432) |
| 3 | Move platform/infra files to sub-folders | 14:08 | 87m | Complete (2b30538, 62eac75) |
| 4 | Address code review round 3 | 15:42 | 7m | Complete (b4f330b) |
| 5 | Delete unused shell barrel | 15:57 | 14m | Complete (9f17cd0) |
| 6 | Annotate deleted files in review prompt | 16:11 | 14m | Complete (286f227) |
| 7 | complete-task (create) | ~16:15 | ~5m | PR created, CI passed |
| 8 | CodeRabbit review | ~16:20 | ~5m | 4 comments |
| 9 | Remove dead re-exports + fix knip | 16:37 | 26m | Complete (8ad6814) |
| 10 | complete-task (update, reject reviews) | ~16:38 | ~3m | Failed: unresolved feedback |
| 11 | Fix rename path handling + test | 16:48 | 11m | Complete (60921a5) |
| 12 | complete-task (update, reject reviews) | ~16:49 | ~3m | Failed: unresolved feedback |
| 13 | Stale CHANGES_REQUESTED review dismissed by human | — | — | CodeRabbit approved |

### Pipeline Inefficiency Diagnosis

1. **Context compaction** caused loss of working state between sessions, requiring re-reading of files and re-establishing context.
2. **Knip CI failure** after deleting `shell/index.ts` barrel was not caught locally — required a full complete-task round-trip to discover.
3. **CodeRabbit feedback on rename handling** was a genuine bug that local code review missed.
4. **Stale CHANGES_REQUESTED** review blocked mergeability even after all threads were resolved, requiring human intervention.

### Pipeline Improvement Proposals

#### Proposal: Run knip locally before complete-task
- **Problem:** Deleting `shell/index.ts` barrel left a stale knip entry, causing CI failure. Discovery cost ~10 min round-trip.
- **Root cause:** `complete-task` runs `pnpm verify` (lint, typecheck, test) but knip is a separate CI check not in the local verify gate.
- **Proposed change:** Add knip to the local verify gate or as a pre-submit check in complete-task.
- **Expected impact:** ~10 min saved per occurrence of knip-related CI failures.

#### Proposal: Add rename/copy test cases to git diff parsing by default
- **Problem:** `parseDiffNameStatus` used `pathParts.join('\t')` which was incorrect for rename entries. CodeRabbit caught this.
- **Root cause:** Initial implementation only tested simple M/D/A statuses. Rename (R) and copy (C) formats with two paths weren't considered.
- **Proposed change:** Add a convention/checklist item: when implementing git diff parsers, always test R (rename) and C (copy) status lines.
- **Expected impact:** Prevents similar bugs in future git parsing code.

## All Feedback

### Local Reviews

#### code-review-7.md
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | SD-029: Type guards forbidden in pipeline-outcome.ts:29-31,40-42 | ❌ | Pre-existing code, not introduced by this PR |

#### bug-scanner-7.md
| Result | Notes |
|--------|-------|
| PASS | 0 findings |

#### architecture-review-7.md
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | SoC-004: Domain I/O in pipeline-outcome.ts (writeFileSync) | ❌ | Pre-existing, not introduced by this PR |
| 2 | SoC-004: Domain I/O in run-code-review.ts (readFile, readdirSync) | ❌ | Pre-existing, not introduced by this PR |
| 3 | SoC-004: Domain I/O in workflow-setup.ts (mkdir) | ❌ | Pre-existing, not introduced by this PR |

---

### GitHub Reviews

#### CodeRabbit
| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | ADR-002 documents infra sub-folder constraint but codebase violates it | ❌ | Addressed in earlier commits (2b30538, 62eac75) before PR was created. CodeRabbit scanned stale state. |
| 2 | Duplicate `DiffFileEntry` — import from git-client.ts instead | ❌ | Both interfaces were un-exported (made private). Structural typing means no import needed. The two interfaces serve different layers (domain vs infra). |
| 3 | Add rename test for `unpushedFilesWithStatus` | ✅ | Added test in commit 60921a5 |
| 4 | `pathParts.join('\t')` produces incorrect path for renames — use `pathParts.at(-1)` | ✅ | Fixed in commit 60921a5 |

---

## 5 Whys Analysis (Accepted GitHub Feedback Only)

### Failure 1: Rename path bug in parseDiffNameStatus

| Question | Answer |
|----------|--------|
| **1. Why wasn't this caught locally?** | Local code review (code-review-7) reviewed the file but didn't flag the `pathParts.join('\t')` logic |
| **2. Which local reviewer should have caught it?** | bug-scanner — this is a logic error (BS-006) |
| **3. Why didn't that reviewer catch it?** | Bug scanner checked `git-client.ts` and passed BS-006 with "Proper condition handling, no off-by-one errors". It didn't consider the multi-path rename format as a logic error scenario |
| **4. What is the root cause of the gap?** | Bug scanner rules don't include git-specific format knowledge (rename entries have 2 tab-separated paths). The `join('\t')` appeared syntactically correct |
| **5. What improvement prevents this next time?** | Add RFC rule: "When parsing structured text formats, verify handling of all documented variants (not just the common case)". For git specifically, always test R/C status lines |

**Root Cause:** Bug scanner lacks domain-specific knowledge about git's `--name-status` output format variants.
**Recommended Fix:** Add RFC rule for structured format parsing completeness. Add git diff format variants to testing conventions.

### Failure 2: Missing rename test case

| Question | Answer |
|----------|--------|
| **1. Why wasn't this caught locally?** | Tests covered M, D, A, and malformed lines but not R (rename) or C (copy) |
| **2. Which local reviewer should have caught it?** | code-review — test coverage completeness |
| **3. Why didn't that reviewer catch it?** | Code review didn't cross-reference git's `--name-status` documentation against test cases |
| **4. What is the root cause of the gap?** | No convention requiring edge case enumeration for external format parsers |
| **5. What improvement prevents this next time?** | Add testing convention: "When parsing external tool output, enumerate all documented format variants in tests" |

**Root Cause:** No convention for testing all variants of external format parsers.
**Recommended Fix:** Add testing convention for external format parser completeness.

---

## Recommended Follow-Ups

- Add knip to local verify gate or complete-task pre-submit check (pipeline improvement)
- ✅ Add RFC-017: structured format parsing must handle all documented variants
- Create issue: introduce test-reviewer agent into code review process with external format parser rule
- ✅ Update task-workflow.md: pre-existing issues in modified files must be fixed
- ✅ Update pre-merge-reflection: analyze ALL review rounds, not just the latest
- Address pre-existing SoC-004 violations in pipeline-outcome.ts, run-code-review.ts, workflow-setup.ts (tech debt, not this PR)
- Address pre-existing SD-029 type guard violation in pipeline-outcome.ts (tech debt, not this PR)
