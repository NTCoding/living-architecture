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
    ├── submit-pr subagent → captures output
    ├── Check reviewDecision (CHANGES_REQUESTED = not mergeable)
    ├── Address ALL CodeRabbit feedback (comments + nitpicks)
    ├── Re-run submit-pr if fixes made
    └── Return SUCCESS with PR ready to merge
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

5. **Resolve CodeRabbit feedback** (principles: CHANGES_REQUESTED means not mergeable; nitpicks contain valuable information):
   - Get PR number: `gh pr view --json number -q .number`
   - Check reviewDecision: `gh pr view --json reviewDecision -q .reviewDecision`
   - If CHANGES_REQUESTED:
     - Get CodeRabbit comments: `gh api repos/NTCoding/living-architecture/pulls/<PR>/comments --jq '.[] | select(.user.login | startswith("coderabbitai"))'`
     - For each comment: fix it OR document why not fixing (with reason)
     - Commit, push, run `./scripts/submit-pr.sh --update`
     - Repeat until reviewDecision is not CHANGES_REQUESTED
   - Parse nitpicks from submit-pr output (look for "## Nitpicks to Consider")
   - For each nitpick: fix it OR document why not fixing (with reason)
   - If any fixes made: commit, push, run `./scripts/submit-pr.sh --update`
   - SUCCESS → return structured message:

     PR READY FOR REVIEW

     ## Pipeline Status
     - Verify gate: PASS
     - Code review: PASS [or SKIPPED if --feedback-rejected]
     - Task check: PASS [or SKIPPED if no issue]
     - CI checks: PASS
     - CodeRabbit: APPROVED [or COMMENTED - no blocking issues]

     ## CodeRabbit Feedback Addressed
     [For each comment/nitpick: file:line - summary - FIXED or NOT FIXING: reason]
     OR "None"

     ## PR
     <url> (ready to merge)

## Debugging SonarCloud Failures

When SonarCloud fails with coverage issues:

1. **Get the exact failure details** - Do NOT guess. Query the SonarCloud API:
   ```bash
   # Get PR number: gh pr view --json number -q .number
   curl -s "https://sonarcloud.io/api/measures/component_tree?component=NTCoding_living-architecture&pullRequest=<PR_NUMBER>&metricKeys=new_coverage&strategy=leaves&ps=100" | jq '.components[] | select(.measures[0].value == "0.0" or .measures[0].value == null) | {path: .path, coverage: .measures[0].value}'
   ```

2. **Identify the root cause** based on actual data:
   - Files with `null` coverage = lcov.info paths not matching source files
   - Files with `0.0` coverage = tests not covering the code
   - Type-only files (interfaces, types) = exclude from coverage in sonar-project.properties
