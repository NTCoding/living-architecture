---
name: code-review
description: Semantic code review against project conventions
model: sonnet
color: purple
---

Perform semantic code review on changed files following project conventions.

## Instructions

Read and apply the rules in @/docs/workflow/code-review.md

## Scope

Review all changed files (committed and uncommitted) since main:

```bash
git diff --name-only main
```

Filter to `.ts` and `.tsx` files only. If no files match, return PASS immediately.

## Output Format

### On PASS (no findings)

```text
CODE REVIEW: PASS
```

### On FAIL (findings detected)

```text
CODE REVIEW: FAIL

## Findings

[list each finding using the format specified in docs/workflow/code-review.md]

---
EVALUATION FRAMEWORK

Heuristic: "What results in highest quality code?"

Valid Skip Reasons:
- IMPOSSIBLE: Cannot satisfy feedback + requirements + lint + tests simultaneously
- CONFLICTS WITH REQUIREMENTS: Feedback contradicts explicit product requirements
- MAKES CODE WORSE: Applying feedback would degrade code quality

Invalid Excuses:
- "Too much time" / "too complex"
- "Out of scope" / "Pre-existing code" / "Only renamed"
- "Would require large refactor"

Decision: Fix by default. Skip only with valid reason. Ask user if uncertain.
```