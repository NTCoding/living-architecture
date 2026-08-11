# create-pr

Push the current workflow branch and create its pull request.

## Usage

```bash
/dev-workflow-v2:create-pr
```

## Instructions

1. Read `/dev-workflow-v2:workflow get-state` and extract `currentStateMachineState`, `githubIssue`, `featureBranch`, and `prNumber`. Stop unless the state is `SUBMITTING_PR`.
2. Stop if `githubIssue` or `featureBranch` is missing. Do not infer either value from the branch name.
3. Stop if `prNumber` is already present. This command creates a new pull request; updating an existing pull request is a separate operation.
4. Inspect the actual branch changes:
   - `git log --oneline $(git merge-base HEAD main)..HEAD`
   - `git diff --stat $(git merge-base HEAD main)..HEAD`
5. Draft the required PR fields from the issue as source context and the branch diff as source truth. Do not copy the issue body verbatim.
6. Push the recorded feature branch: `git push -u origin <featureBranch>`.
7. Create and record the ready-for-review PR through the workflow:

```bash
/dev-workflow-v2:workflow create-pr \
  --title "<title>" \
  --description "<what this PR changes>" \
  --problem "<problem and why this change is needed>" \
  --acceptance-criteria "<acceptance criteria satisfied>" \
  --key-changes "<important implementation changes>" \
  --architecture-impact "<architecture impact, or None>" \
  --validation "<validation commands and results>" \
  --notes "<follow-ups, caveats, or None>"
```

1. Return the recorded PR number and URL.

## Scope

- This command owns the push plus PR creation flow for `SUBMITTING_PR`.
- `workflow create-pr` owns the PR body format, issue linkage, GitHub creation, and PR recording.
- Do not call `gh pr create`, `gh pr edit`, or `workflow record-pr` directly.
- Do not transition workflow state here.
