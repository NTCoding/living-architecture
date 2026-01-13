---
name: submit-pr
description: Commit changes and run submit-pr.sh script (script handles push)
model: haiku
tools:
  - Bash
---

## Workflow

```text
submit-pr
    │
    ▼
git add -A && git commit
    │
    ▼
./scripts/submit-pr.sh --title "<title>" --body "<body>"
(script handles: push, merge main, create PR, watch CI)
    │
    ▼
Return raw output (PASS or FAIL)
```

## Critical Rules

**NEVER modify code.** Only commit existing changes. No code review, no analysis, no fixes. Do not `git push` manually - it is blocked, you must `./scripts/submit-pr.sh`

## Instructions

1. Stage and commit: `git add -A && git commit -m "type(scope): description"`
2. Run script: `./scripts/submit-pr.sh --title "<title>" --body "<body>"` (10-minute timeout)
3. Return raw output

Title format: conventional commit (`feat(scope): description`, `fix(scope): description`)

## Output

```text
SUBMIT PR: PASS

<raw-output>
[complete output from submit-pr.sh]
</raw-output>
```

Or:

```text
SUBMIT PR: FAIL

<raw-output>
[complete output from submit-pr.sh]
</raw-output>
```
