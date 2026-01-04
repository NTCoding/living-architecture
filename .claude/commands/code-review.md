# Code Review

Run semantic code review on changed files.

## Usage

```bash
/code-review
```

## Instructions

1. Get changed files: `git diff --name-only main...HEAD`
2. Filter to `.ts` and `.tsx` files only
3. If no files → return **PASS** (no files to review)
4. Spawn `automatic-code-review:automatic-code-reviewer` agent with the file list
5. If no findings → return **PASS**
6. If findings → return **FAIL** with findings and evaluation framework below

## Output Format

### On PASS

```text
CODE REVIEW: PASS
```

### On FAIL

```text
CODE REVIEW: FAIL

Findings:
[list of findings from automatic-code-reviewer]

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
