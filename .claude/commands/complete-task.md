# Complete Task

## Workflow

```text
/complete-task
    │
    ▼
Main agent runs pipeline directly
    │
    ├── Verify gate → FAIL → return to main
    ├── code-review subagent → FAIL → return findings + next steps
    ├── Task-check subagent → FAIL → return issues
    ├── submit-pr subagent → FAIL → return issues
    └── Return SUCCESS with PR URL
```

## Usage

```bash
/complete-task                    # Full pipeline
/complete-task --feedback-rejected # Skip code review
```

## Instructions

Run this pipeline directly (do NOT spawn a subagent to orchestrate - subagents cannot spawn other subagents). Stop and return on first failure.

1. **Verify gate**: Run `pnpm nx run-many -t lint,typecheck,test` (use 5 minute timeout)
   - FAIL → return:
     VERIFY GATE FAILED
     <raw-output>
     [paste the COMPLETE error output here - do not summarize]
     </raw-output>
     NEXT STEPS: Fix the errors and re-run /complete-task
     LOOP CONTROL: If this is your third successive attempt, ask the user for help.

2. **Code review** [SKIP IF --feedback-rejected]:
   - Use Task tool with subagent_type: "code-review", prompt: "Review changed files"
   - PASS → continue
   - FAIL → return:
     CODE REVIEW FAILED
     <raw-output>
     [paste the COMPLETE output from code-review subagent here - do not summarize]
     </raw-output>
     NEXT STEPS:
     - Fix issues and re-run /complete-task
     - OR reject all findings and re-run /complete-task --feedback-rejected
     LOOP CONTROL: If this is your third successive attempt, ask the user for help.

3. **Task-check** [SKIP IF marker exists OR no issue]:
   - Get current branch: `git branch --show-current`
   - Extract issue number from branch (pattern: `issue-<NUMBER>-...`)
   - If no issue number found → skip to step 4 (no task to verify)
   - Check if `/tmp/task-check-done-<branch>.marker` exists
   - If marker exists → skip to step 4
   - If missing:
     - Build work summary: list changed files via `git diff --name-only main`
     - Use Task tool with subagent_type: "task-check:task-check", prompt:
       ```text
       Task ID: <issue-number>
       Task location: gh issue view <issue-number>
       Work summary: Modified files: <list of changed files>
       Attempt: 1
       ```
     - FAIL → return:
       TASK CHECK FAILED
       <raw-output>
       [paste the COMPLETE output here - do not summarize]
       </raw-output>
       NEXT STEPS: Address the issues and re-run /complete-task
       LOOP CONTROL: If this is your third successive attempt, ask the user for help.
     - PASS → create marker: `date > /tmp/task-check-done-<branch>.marker`

4. **Submit PR**:
   - Use Task tool with subagent_type: "submit-pr", prompt: "Submit the PR"
   - FAIL → return:
     SUBMIT PR FAILED
     <raw-output>
     [paste the COMPLETE raw output here - do not summarize]
     </raw-output>
     NEXT STEPS: Address the issues and re-run /complete-task
     LOOP CONTROL: If this is your third successive attempt, ask the user for help.
   - SUCCESS → return:
     PR READY FOR REVIEW
     <raw-output>
     [paste the COMPLETE raw output here - do not summarize]
     </raw-output>
