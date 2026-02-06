# Post-Merge Reflection: issue-239-m1-d1-8-d1-9-wire-connection-e

## Summary

Wired `detectConnections` from `riviere-extract-ts` into the `riviere extract` CLI command with performance instrumentation, new flags (`--patterns`, `--stats`), and changed output format to include links. The implementation required multiple architecture review iterations to find the correct layer placement for connection detection logic — ultimately inlining it in the entrypoint after failed attempts with `commands/` and `queries/` layers.

## Pipeline Timeline

**Overall duration:** ~110 minutes (20:51 UTC first commit → 22:40 UTC final commit)

| # | Step | Start Time | Duration | Outcome |
|---|------|------------|----------|---------|
| 1 | Initial implementation (TDD Steps 1-9) | 20:51 | ~0m | Complete (done in prior session) |
| 2 | Local code review #2 | ~20:52 | ~2m | 1 finding (SD-019: type guards → Zod) |
| 3 | Fix SD-019, commit | ~20:54 | ~8m | 452a5ec |
| 4 | Architecture review #3 | ~21:02 | ~5m | 1 finding (CS-010: commands/ wrong layer) |
| 5 | Move to queries/, commit | ~21:07 | ~4m | 1dfb027 |
| 6 | Architecture review #7 | ~21:11 | ~5m | 1 finding (CS-010: queries/ has presentation) |
| 7 | Split query from presentation, commit | ~21:16 | ~35m | eb24915 |
| 8 | PR #252 created | ~21:51 | ~3m | Created |
| 9 | CI checks + CodeRabbit review | ~21:54 | ~10m | 8 comments |
| 10 | Address 6 CodeRabbit items, commit | ~22:04 | ~2m | 5a5cd62 |
| 11 | Architecture review #10 | ~22:06 | ~5m | 1 finding (CS-010: thin query wrapper) |
| 12 | Inline detectConnections, remove query, commit | ~22:11 | ~20m | 3ebc6b3 |
| 13 | Address 2 more CodeRabbit items (forEach), commit | ~22:31 | ~9m | a225131 |
| 14 | Final complete-task, PR approved | ~22:40 | ~3m | PASS |

### Pipeline Inefficiency Diagnosis

- **4 architecture review iterations** for the same CS-010 rule: The connection detection logic was placed in `commands/` → moved to `queries/` → split query/presentation → inlined in entrypoint. Each iteration cost ~10 minutes. The root cause was not understanding that `detectConnections` is a simple function call with no orchestration value — it should have been inlined from the start.
- **150-line entrypoint limit fighting**: After inlining, significant time was spent trying to fit within 150 lines while satisfying competing lint rules (`@stylistic/object-curly-newline` prevents compact destructurings). Prettier also reverted manual compaction on commit.
- **GitHub auth issues** consumed time in the previous session (wrong account token).

## All Feedback

### Local Reviews

#### code-review-2.md

| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | SD-019: Type guards `isExtractionOutput`/`isFullExtractionOutput` should use Zod schemas | ✅ | - |
| 2 | TS-014: Edge case checklist for error-codes.spec.ts | ❌ | False alarm — file tests enum definitions, no functions to edge-case test |

#### architecture-review-3.md

| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | CS-010: `detect-and-output-connections.ts` in `commands/` doesn't orchestrate a write | ✅ | - |
| 2 | CS-010: Naming — "detect-and-output-connections" not verb-object form | ✅ | - |

#### architecture-review-7.md

| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | CS-010: File in `queries/` performs CLI output — mixed presentation with query | ✅ | - |

#### architecture-review-10.md

| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | CS-010: `detect-connections-query.ts` is a thin pass-through wrapper with no orchestration | ✅ | - |

#### bug-scanner (all iterations)

| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| - | All PASS, no findings | - | - |

#### task-check-1.md

| Result | Notes |
|--------|-------|
| PASS | All acceptance criteria verified with file:line evidence |

---

### GitHub Reviews

#### CodeRabbit

| # | Feedback | Accepted? | Rejected Reason |
|---|----------|-----------|-----------------|
| 1 | Inconsistent error message formatting between parse functions | ✅ | - |
| 2 | Add `afterEach(() => vi.restoreAllMocks())` to connection spec | ✅ | - |
| 3 | Wire `--patterns` flag into connection detection | ❌ | `--patterns` is a placeholder for M4 (Configurable layer). Pattern matching implementation is deferred per PRD milestone plan. |
| 4 | Reuse `ConnectionDetectionOptions` type instead of `DetectConnectionsInput` | ❌ | File was deleted — query wrapper removed entirely. Moot. |
| 5 | Rename test "formats timing with sub-millisecond precision" → "truncates sub-millisecond values to zero" | ✅ | - |
| 6 | Rename `filteringMs` → `setupMs` (measures indexing + filtering) | ✅ | - |
| 7 | Use block body in forEach callback (dry-run) to avoid implicit return | ✅ | - |
| 8 | Use block body in forEach callback (stats) to avoid implicit return | ✅ | - |

---

## 5 Whys Analysis (Accepted GitHub Feedback Only)

### Failure 1: Inconsistent error message formatting between parse functions

| Question | Answer |
|----------|--------|
| **1. Why wasn't this caught locally?** | Code review only checks against SD/AP/TS rules. Inconsistent formatting isn't a named rule violation. |
| **2. Which local reviewer should have caught it?** | code-review |
| **3. Why didn't that reviewer catch it?** | No rule for "consistent error formatting across related functions" |
| **4. What is the root cause of the gap?** | The functions were written at different times (one existed, one was new) and the new one copied a different pattern |
| **5. What improvement prevents this next time?** | Add RFC: "When adding a function that mirrors an existing function, verify formatting/patterns are consistent" |

**Root Cause:** New function didn't follow the pattern of its sibling function.
**Recommended Fix:** Add anti-pattern AP-009: Inconsistent Patterns Between Related Functions.

### Failure 2: Missing `afterEach(() => vi.restoreAllMocks())` in test file

| Question | Answer |
|----------|--------|
| **1. Why wasn't this caught locally?** | Bug scanner doesn't check for test mock cleanup. Code review doesn't flag missing afterEach. |
| **2. Which local reviewer should have caught it?** | code-review (TS-012: Mock Globals with vi.spyOn) |
| **3. Why didn't that reviewer catch it?** | TS-012 checks that vi.spyOn is used instead of direct assignment, but doesn't check for cleanup after spying |
| **4. What is the root cause of the gap?** | TS-012 is about the mechanism of mocking, not the lifecycle management of mocks |
| **5. What improvement prevents this next time?** | Extend TS-012 or add new rule: "When vi.spyOn is used, verify afterEach restores mocks" |

**Root Cause:** TS-012 checks mock mechanism but not mock cleanup.
**Recommended Fix:** Add RFC-016: Mock Cleanup After vi.spyOn (bug-scanner detection).

### Failure 3: Misleading test name ("precision" when testing "truncation")

| Question | Answer |
|----------|--------|
| **1. Why wasn't this caught locally?** | TS-001/TS-013 check that test names describe outcomes, but the name was plausible — "sub-millisecond precision" sounds correct until you read the assertion |
| **2. Which local reviewer should have caught it?** | code-review (TS-013: Assertion-to-Title Alignment) |
| **3. Why didn't that reviewer catch it?** | The test name was close enough to pass TS-013. "Precision" and "truncation" are related concepts. |
| **4. What is the root cause of the gap?** | TS-013 checks structural alignment but can't catch subtle semantic mismatches |
| **5. What improvement prevents this next time?** | No actionable rule change — this is a semantic judgement call that requires domain understanding |

**Root Cause:** Subtle semantic mismatch between test name and assertion behavior.
**Recommended Fix:** None — this is inherently a human/AI judgement call that can't be reliably rule-enforced.

### Failure 4: `filteringMs` naming inaccurate (measures indexing + filtering)

| Question | Answer |
|----------|--------|
| **1. Why wasn't this caught locally?** | SD-005 checks for "intention-revealing names" but the name "filteringMs" was plausible when written |
| **2. Which local reviewer should have caught it?** | code-review (SD-005: Intention-Revealing Names Only) |
| **3. Why didn't that reviewer catch it?** | SD-005 flags clearly wrong names (data, utils, handler) but "filteringMs" is domain-specific and appeared intention-revealing |
| **4. What is the root cause of the gap?** | The timing variable was named for the initial operation but then expanded to include ComponentIndex construction |
| **5. What improvement prevents this next time?** | No actionable rule change — naming accuracy requires understanding what code actually does vs what it was originally named for |

**Root Cause:** Name was accurate when written but became inaccurate as scope of measured work expanded.
**Recommended Fix:** None — this is a semantic accuracy issue that requires domain understanding.

### Failure 5: forEach implicit return (Biome lint warning)

| Question | Answer |
|----------|--------|
| **1. Why wasn't this caught locally?** | Project uses ESLint, not Biome. ESLint doesn't have this specific rule. |
| **2. Which local reviewer should have caught it?** | code-review |
| **3. Why didn't that reviewer catch it?** | No equivalent ESLint rule configured for `useIterableCallbackReturn` |
| **4. What is the root cause of the gap?** | CodeRabbit uses Biome which has rules the project's ESLint doesn't cover |
| **5. What improvement prevents this next time?** | Use for-of loops instead of forEach as the default pattern to avoid the issue entirely |

**Root Cause:** Biome has rules that project's ESLint doesn't cover.
**Recommended Fix:** Add RFC: "Prefer for-of over forEach for side-effect-only iteration to avoid implicit return warnings".

---

## Pipeline Improvement Proposals

### Proposal: Pre-flight layer placement check for simple function calls

- **Problem:** 4 architecture review iterations (~40 minutes) to place `detectConnections` correctly. Moved commands/ → queries/ → split query/presentation → inlined in entrypoint.
- **Root cause:** No guidance on when a function call is too simple for commands/ or queries/ wrappers. The decision tree in separation-of-concerns covers _what_ belongs where, but doesn't address the case where a single function call has no orchestration value.
- **Proposed change:** Add guidance to separation-of-concerns or the task workflow: "Before creating a command or query wrapper, check if the function being called requires orchestration (loading, domain logic, persistence). If it's a single function call with no orchestration, inline it in the entrypoint."
- **Expected impact:** ~30 minutes saved per occurrence (eliminates multiple architecture review iterations for trivial wrappers).

### Proposal: Run architecture review before first commit, not after

- **Problem:** Architecture placement issues were only caught after code was written and committed, requiring rework.
- **Root cause:** The workflow runs architecture review as a post-implementation gate. For layer placement decisions, this is too late — the code is already written in the wrong place.
- **Proposed change:** Add a "placement check" step to the task workflow before implementation: identify which layer(s) will be touched, verify against the decision tree, then implement.
- **Expected impact:** ~20 minutes saved when layer placement is non-obvious. Front-loads the decision that currently causes the most rework.

## Recommended Follow-Ups

- ✅ Added AP-009: Inconsistent Patterns Between Related Functions (anti-patterns.md)
- ✅ Added RFC-016: Mock Cleanup After vi.spyOn (review-feedback-checks.md)
- Add RFC: "Prefer for-of over forEach for side-effect-only iteration"
- Create task: Add pre-implementation placement check to task workflow
- Create task: Add "single function call = inline in entrypoint" guidance to separation-of-concerns
