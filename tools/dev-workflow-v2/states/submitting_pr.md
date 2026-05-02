# SUBMITTING_PR State

You are creating or updating the pull request.

## TODO

- [ ] Push the branch: `git push -u origin <branch-name>`
- [ ] Run `/dev-workflow-v2:workflow get-state` and extract `githubIssue` from its JSON output
- [ ] Create the PR with `/dev-workflow-v2:workflow create-pr` and all required options below. The workflow owns the PR structure and records the PR.

  ```bash
  /dev-workflow-v2:workflow create-pr \
    --title "<PR title>" \
    --description "<What this PR changes.>" \
    --problem "<Problem statement and why this change is needed.>" \
    --acceptance-criteria "<Acceptance criteria satisfied by this PR.>" \
    --key-changes "<Important implementation changes.>" \
    --architecture-impact "<Architecture impact, or None.>" \
    --validation "<Validation commands and results.>" \
    --notes "<Follow-ups, caveats, or None.>"
  ```

  The command creates this exact PR body structure:

  ```md
  ## Description

  <from --description>

  ## Linked Issue

  Closes #<from recorded githubIssue>

  ## What Problem Does This PR Solve?

  <from --problem>

  ## Acceptance Criteria

  <from --acceptance-criteria>

  ## Key Changes

  <from --key-changes>

  ## Notable Architectural Changes / Impact

  <from --architecture-impact>

  ## Validation

  <from --validation>

  ## Notes

  <from --notes>
  ```

- [ ] Transition to AWAITING_CI: `/dev-workflow-v2:workflow transition AWAITING_CI`

## Constraints

- `git push` is ALLOWED in this state (exempted from the global block)
- Do not call `gh pr create` directly. Use `/dev-workflow-v2:workflow create-pr` with the required options so the workflow creates the standard PR body, adds `Closes #<issue-number>` from recorded state, creates a ready-for-review PR, and records the PR.
- Do not pass raw `gh pr create` flags. The only accepted options are `--title`, `--description`, `--problem`, `--acceptance-criteria`, `--key-changes`, `--architecture-impact`, `--validation`, and `--notes`.
- If `create-pr` fails, retry with correct required options or transition to BLOCKED. Do not use `gh pr create`, `gh pr ready`, or `record-pr` as a workaround.
- Cannot transition to AWAITING_CI unless prNumber is recorded
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
