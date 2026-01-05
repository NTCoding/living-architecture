---
name: submit-pr
description: Commit changes, push to remote, and create/update PR
model: sonnet
color: green
---

Submit PR.

## Steps

1. Commit changes
2. Push to remote
3. Run `./scripts/submit-pr.sh` (use 10 minute timeout - script waits for CI)
4. Capture the COMPLETE raw output from the script

## Output Format

### On SUCCESS

```text
SUBMIT PR: PASS

<raw-output>
[paste the COMPLETE raw output from submit-pr.sh here - do not summarize]
</raw-output>
```

### On FAILURE

```text
SUBMIT PR: FAIL

<raw-output>
[paste the COMPLETE raw output from submit-pr.sh here - do not summarize]
</raw-output>
```
