# Complete Task

## Workflow

```text
/complete-task
    │
    ▼
Spawn sub-agent with pipeline
    │
    ├── Verify gate → FAIL → return to main
    ├── /code-review → FAIL → return findings + next steps
    ├── Task-check  → FAIL → return issues
    ├── Submit PR → FAIL → return issues
    └── Return SUCCESS with PR URL
```

## Usage

```bash
/complete-task                    # Full pipeline
/complete-task --feedback-rejected # Skip code review
```

## Instructions

Use the Task tool:

```yaml
subagent_type: general-purpose
model: haiku
prompt: |
  Run this pipeline. Stop and return on first failure.

  1. **Verify gate**: Run `pnpm nx run-many -t lint,typecheck,test`
     - FAIL → return:
       VERIFY GATE FAILED
       [error output]
       NEXT STEPS: Fix the errors and re-run /complete-task
       LOOP CONTROL: If this is your third successive attempt, ask the user for help.

  2. **Code review** [SKIP IF --feedback-rejected]:
     - Run `/code-review`
     - PASS → continue
     - FAIL → return:
       CODE REVIEW FAILED
       [findings from /code-review]
       NEXT STEPS:
       - Fix issues and re-run /complete-task
       - OR reject all findings and re-run /complete-task --feedback-rejected
       LOOP CONTROL: If this is your third successive attempt, ask the user for help.

  3. **Task-check** [SKIP IF marker exists]:
     - Check if `/tmp/task-check-done-<branch>.marker` exists
     - If exists → skip to step 4
     - If missing:
       - Use Task tool with subagent_type: "task-check:task-check"
       - FAIL → return:
         TASK CHECK FAILED
         [issues]
         NEXT STEPS: Address the issues and re-run /complete-task
         LOOP CONTROL: If this is your third successive attempt, ask the user for help.
       - PASS → create marker: `date > /tmp/task-check-done-<branch>.marker`

  4. **Submit PR**:
     - Commit changes
     - Push to remote
     - Run `./scripts/submit-pr.sh` and wait for it to complete (may take several minutes)
     - Capture the COMPLETE raw output from the script
     - FAIL → return:
       SUBMIT PR FAILED
       <raw-output>
       [paste the COMPLETE raw output from submit-pr.sh here - do not summarize]
       </raw-output>
       NEXT STEPS: Address the issues and re-run /complete-task
       LOOP CONTROL: If this is your third successive attempt, ask the user for help.
     - SUCCESS → return:
       PR READY FOR REVIEW
       <raw-output>
       [paste the COMPLETE raw output from submit-pr.sh here - do not summarize]
       </raw-output>
```
