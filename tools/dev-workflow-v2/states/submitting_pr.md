# SUBMITTING_PR State

You are creating or updating the pull request.

## TODO

- [ ] Push the branch: `git push -u origin <branch-name>`
- [ ] Create or update the PR with a clear, well-articulated body that uses this template:

  ```md
  ## Description

  <Clear explanation of what this PR does.>

  ## Linked Issue

  Closes #<issue-number>

  ## What Problem Does This PR Solve?

  <Problem statement and why this change is needed.>

  ## Key Changes

  - <change 1>
  - <change 2>
  - <change 3>

  ## Notable Architectural Changes / Impact

  <Architectural impact, or "None.">

  ## Validation

  - <command>
  - <command>

  ## Notes

  <Follow-ups, caveats, or "None.">
  ```

- [ ] Record the PR: `/dev-workflow-v2:workflow record-pr <PR_NUMBER> [PR_URL]`
- [ ] Transition to AWAITING_CI: `/dev-workflow-v2:workflow transition AWAITING_CI`

## Constraints

- `git push` and `gh pr` are ALLOWED in this state (exempted from the global block)
- The PR body MUST contain `Closes #<issue-number>` in the `Linked Issue` section
- Cannot transition to AWAITING_CI unless prNumber is recorded
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
